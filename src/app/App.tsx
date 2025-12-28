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

const DEFAULT_CODE = `let x = 1;
let y = 2;
console.log("start:", x, y);

x += 3;
y -= 1;
console.log("after +=/-=:", x, y);

if (x > y && !(y === 10)) {
  console.log("if branch:", "x is bigger");
} else {
  console.log("else branch:", "y is bigger or equal");
}

// ----- Arrays -----
let arr = [1, 2, 3];
console.log("arr:", arr);
console.log("arr length:", arr.length);
console.log("arr[1]:", arr[1]);

arr.push(4);
arr.unshift(0);
console.log("after push/unshift:", arr);

console.log("pop:", arr.pop());
console.log("shift:", arr.shift());
console.log("after pop/shift:", arr);

arr[1] = 999;
console.log("after arr[1]=999:", arr);

// ----- Objects -----
let obj = { a: 10, b: 20 };
console.log("obj.a:", obj.a);
console.log("obj['b']:", obj["b"]);

obj["c"] = 30;
obj.a = obj.a + 5;
console.log("after updates:", obj);

// ----- While -----
let i = 0;
while (i < 3) {
  console.log("while i:", i);
  i++;
}

// ----- For -----
for (let j = 0; j < 4; j++) {
  console.log("for j:", j);
}

// ----- Stack -----
let s = Stack();
s.push(1);
s.push(2);
s.push(3);
console.log("stack size:", s.size);
console.log("stack peek:", s.peek);
console.log("stack pop:", s.pop());
console.log("stack after pop peek:", s.peek);

// ----- Queue -----
let q = Queue();
q.enqueue(10);
q.enqueue(20);
q.enqueue(30);
console.log("queue size:", q.size);
console.log("queue peek:", q.peek);
console.log("queue dequeue:", q.dequeue());
console.log("queue after dequeue peek:", q.peek);

// ----- BinaryTree -----
let t = BinaryTree();
t.insert(5);
t.insert(2);
t.insert(8);
t.insert(1);
t.insert(3);
console.log("tree contains 2:", t.contains(2));
console.log("tree contains 7:", t.contains(7));

let inorder = t.inOrder();
console.log("tree inOrder:", inorder);
console.log("inOrder length:", inorder.length);
console.log("inOrder[2]:", inorder[2]);
`;
//recursion , classes + inheritance , higher order functions , closures , linked lists , hash maps , sets , graphs 
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

  const consoleLines = useMemo(() => current?.console ?? [], [current]);

  const label = steps[idx]?.label ?? "";
  const canStep = idx < steps.length - 1;

  const onRun = () => {
    const res = runCodeToSteps(code);
    setSteps(res.steps);
    setIdx(0);
    setError(res.error);
  };

  const onStep = () => setIdx((i) => Math.min(steps.length - 1, i + 1));

  const onReset = () => {
    setIdx(0);
    setSteps([]);
    setError(null);
  };

  return (
    <div className="appRoot">
      <div className="topBar">
        <div className="topLeft">
          <h2 className="topTitle">Code Trace</h2>
          <div className="topDesc">
            Run ואז Step כדי לראות משתנים, קונסול, מחסנית, ותצוגה ויזואלית של מבני נתונים
          </div>
        </div>

        <div className="topRight">
          <div className="topMeta">
            <b>Step:</b> {steps.length ? `${idx} / ${steps.length - 1}` : "—"}{" "}
            {current ? <span className="topLine">| line {current.currentLine}</span> : null}
          </div>
          <div className="topLabel">{label}</div>
          {error ? <div className="topError">Error: {error}</div> : null}
        </div>
      </div>

      <div className="layoutTop">
        <div className="leftCol">
          <CodeEditor value={code} onChange={setCode} activeLine={current?.currentLine} />
          <Controls canStep={canStep} isRunning={!!steps.length} onRun={onRun} onStep={onStep} onReset={onReset} />
        </div>

        <div className="rightCol">
          <VariablesPanel vars={vars} />
          <ConsolePanel lines={consoleLines} />
          <StackPanel stack={current?.stack ?? []} activeLine={current?.currentLine} />
        </div>
      </div>

      <div className="layoutBottom">
        <StructuresPanel state={current} />
      </div>
    </div>
  );
}
