import { useMemo, useState } from "react";
import "../index.css";

import CodeEditor from "../editor/CodeEditor";
import Controls from "../ui/Controls";
import VariablesPanel from "../ui/VariablesPanel";
import ConsolePanel from "../ui/ConsolePanel";
import StackPanel from "../ui/StackPanel";
import StructuresPanel, { type DSFocus } from "../ui/StructuresPanel";
import CodeArsenalModal from "../ui/CodeArsenalModal";

import { runCodeToSteps } from "../interpreter/index";
import type { ExecutionState, Step, Value } from "../engine/types";

const DEFAULT_CODE = `function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

console.log("fib(6):", fib(6));
`;

function isRef(v: Value): v is { $ref: string } {
  return !!v && typeof v === "object" && "$ref" in v;
}

function fmtValue(state: ExecutionState, v: Value): string {
  if (isRef(v)) {
    const o: any = state.heap[v.$ref];
    if (!o) return "[ref]";
    if (o.kind === "Array") return `[${(o.items as Value[]).map((x) => fmtValue(state, x)).join(", ")}]`;
    if (o.kind === "Stack") return `Stack(${(o.items as Value[]).map((x) => fmtValue(state, x)).join(", ")})`;
    if (o.kind === "Queue") return `Queue(${(o.items as Value[]).map((x) => fmtValue(state, x)).join(", ")})`;
    if (o.kind === "BinaryTree") return `BinaryTree(${o.root ? fmtValue(state, o.root) : "empty"})`;
    if (o.kind === "TreeNode") return `Node(${fmtValue(state, o.value)})`;
    if (o.kind === "Function") return `function ${o.name}()`;
    if (o.kind === "Class") return `class ${o.name}`;
    if (o.kind === "Instance") {
      const cls = isRef(o.classRef) ? (state.heap[o.classRef.$ref] as any) : null;
      const name = cls && cls.kind === "Class" ? cls.name : "Instance";
      return `${name} instance`;
    }
    if (o.kind === "CallTrace") return "CallTrace";
    if (o.kind === "CallNode") return `Call(${o.fnName})`;
    if (o.kind === "Object") return `Object(${Object.keys(o.props || {}).length})`;
    return o.kind;
  }
  return String(v);
}

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [steps, setSteps] = useState<Step[]>([]);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [arsenalOpen, setArsenalOpen] = useState(false);

  const [dsFocus, setDsFocus] = useState<DSFocus | null>(null);

  const current = steps[idx]?.state ?? null;

  const vars = useMemo(() => {
    if (!current) return {};
    const activeFrame = current.stack[current.stack.length - 1];
    return Object.fromEntries(
      Object.entries(activeFrame.locals).map(([k, v]) => [k, fmtValue(current, v)])
    );
  }, [current]);

  const consoleLines = useMemo(() => current?.console ?? [], [current]);

  const canStep = idx < steps.length - 1;

  const onRun = () => {
    const res = runCodeToSteps(code);
    setSteps(res.steps);
    setIdx(0);
    setError(res.error ?? null);
    setDsFocus(null);
  };

  const onStep = () => setIdx((i) => Math.min(steps.length - 1, i + 1));

  const onReset = () => {
    setIdx(0);
    setSteps([]);
    setError(null);
    setDsFocus(null);
  };

  const closeDsModal = () => setDsFocus(null);

  const dsModalTitle = dsFocus ? dsFocus.kind : "Data Structure";

  return (
    <div className="appRoot">
      <div className="topBar">
        <div className="topLeft">
          <h2 className="topTitle">Code Trace</h2>
          <div className="topDesc">
            Run ואז Step כדי לראות משתנים, קונסול, מחסנית ותצוגה ויזואלית
          </div>
        </div>

        <div className="topRight">
          <div className="topMeta">
            <b>Step:</b>{" "}
            {steps.length ? `${idx} / ${steps.length - 1}` : "—"}
            {current ? <span className="topLine"> | line {current.currentLine}</span> : null}
          </div>
          {error ? <div className="topError">Error: {error}</div> : null}
        </div>
      </div>

      <div className="layoutTop">
        <div className="leftCol">
          <CodeEditor
            value={code}
            onChange={setCode}
            activeLine={current?.currentLine}
          />

          <Controls
            canStep={canStep}
            isRunning={!!steps.length}
            onRun={onRun}
            onStep={onStep}
            onReset={onReset}
            onOpenArsenal={() => setArsenalOpen(true)}
          />
        </div>

        <div className="rightCol">
          <VariablesPanel vars={vars} />
          <ConsolePanel lines={consoleLines} />
          <StackPanel stack={current?.stack ?? []} activeLine={current?.currentLine} />
        </div>
      </div>

      <div className="layoutBottom">
        <StructuresPanel
          state={current}
          onOpen={(focus) => setDsFocus(focus)}
        />
      </div>

      {dsFocus ? (
        <div
          className="dsModalOverlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDsModal();
          }}
        >
          <div className="dsModal dsModalBig" onMouseDown={(e) => e.stopPropagation()}>
            <div className="dsModalHead">
              <div className="dsModalTitle">{dsModalTitle}</div>
              <button className="dsModalClose" onClick={closeDsModal} aria-label="Close">
                ×
              </button>
            </div>

            <div className="dsModalBody dsModalBodyPadless">
              <StructuresPanel state={current} focus={dsFocus} inModal />
            </div>
          </div>
        </div>
      ) : null}

      <CodeArsenalModal
        open={arsenalOpen}
        onClose={() => setArsenalOpen(false)}
        onPick={(snippet) => {
          setCode(snippet);
          setSteps([]);
          setIdx(0);
          setError(null);
          setDsFocus(null);
        }}
      />
    </div>
  );
}
