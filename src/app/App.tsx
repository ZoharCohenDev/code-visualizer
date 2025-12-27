import { useMemo, useState } from "react";
import "../index.css";

import CodeEditor from "../editor/CodeEditor";
import Controls from "../ui/Controls";
import VariablesPanel from "../ui/VariablesPanel";
import ConsolePanel from "../ui/ConsolePanel";
import StackPanel from "../ui/StackPanel";
import StructuresPanel from "../ui/StructuresPanel";

import { runCodeToSteps } from "../interpreter/index";
import type { ExecutionState, Step, Value } from "../engine/types";

const DEFAULT_CODE = `let s = Stack();
s.push(1);
s.push(2);
console.log("stack peek:", s.peek());

let q = Queue();
q.enqueue(10);
q.enqueue(20);
console.log("queue dequeue:", q.dequeue());

let t = BinaryTree();
t.insert(5);
t.insert(2);
t.insert(8);
console.log("contains 2:", t.contains(2));
console.log("inOrder:", t.inOrder());
`;

function isRef(v: Value): v is { $ref: string } {
  return !!v && typeof v === "object" && "$ref" in v;
}

function fmtValue(state: ExecutionState, v: Value): string {
  if (isRef(v)) {
    const o = state.heap[v.$ref];
    if (!o) return "[ref]";
    if (o.kind === "Array") return `[${o.items.map((x) => fmtValue(state, x)).join(", ")}]`;
    if (o.kind === "Stack") return `Stack(${o.items.map((x) => fmtValue(state, x)).join(", ")})`;
    if (o.kind === "Queue") return `Queue(${o.items.map((x) => fmtValue(state, x)).join(", ")})`;
    if (o.kind === "BinaryTree") return `BinaryTree(${o.root ? fmtValue(state, o.root) : "empty"})`;
    if (o.kind === "TreeNode") return `Node(${fmtValue(state, o.value)})`;
    if (o.kind === "Function") return `function ${o.name}()`;
    return `Object(${Object.keys(o.props).length})`;
  }
  return String(v);
}

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [steps, setSteps] = useState<Step[]>([]);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const current = steps[idx]?.state ?? null;

  const vars = useMemo(() => {
    if (!current) return {};
    const activeFrame = current.stack[current.stack.length - 1];
    return Object.fromEntries(
      Object.entries(activeFrame.locals).map(([k, v]) => [k, fmtValue(current, v)])
    );
  }, [current]);

  const consoleLines = useMemo(() => {
    return current?.console ?? [];
  }, [current]);

  const label = steps[idx]?.label ?? "";

  const canStep = idx < steps.length - 1;

  const onRun = () => {
    const res = runCodeToSteps(code);
    setSteps(res.steps);
    setIdx(0);
    setError(res.error);
  };

  const onStep = () => {
    setIdx((i) => Math.min(steps.length - 1, i + 1));
  };

  const onReset = () => {
    setIdx(0);
    setSteps([]);
    setError(null);
  };

  return (
    <div style={{ minHeight: "100vh", padding: 18, maxWidth: 1250, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Code Trace</h2>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Run ואז Step כדי לראות משתנים, קונסול, מחסנית, ותצוגה ויזואלית של מבני נתונים
          </div>
        </div>

        <div style={{ opacity: 0.85, textAlign: "right" }}>
          <div>
            <b>Step:</b>{" "}
            {steps.length ? `${idx} / ${steps.length - 1}` : "—"}{" "}
            {current ? <span style={{ opacity: 0.75 }}>| line {current.currentLine}</span> : null}
          </div>
          <div style={{ marginTop: 6, opacity: 0.75 }}>{label}</div>
          {error ? <div style={{ marginTop: 6, color: "salmon", fontWeight: 800 }}>Error: {error}</div> : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 14, marginTop: 14 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <CodeEditor value={code} onChange={setCode} activeLine={current?.currentLine} />
          <Controls canStep={canStep} isRunning={!!steps.length} onRun={onRun} onStep={onStep} onReset={onReset} />
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <VariablesPanel vars={vars} />
          <ConsolePanel lines={consoleLines} />
          <StackPanel stack={current?.stack ?? []} activeLine={current?.currentLine} />
          <StructuresPanel state={current} />
        </div>
      </div>
    </div>
  );
}
