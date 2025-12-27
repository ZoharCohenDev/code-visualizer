export type Primitive = string | number | boolean | null | undefined;

export type Ref = { $ref: string };

export type Value = Primitive | Ref;

export type HeapObject =
  | { kind: "Array"; items: Value[] }
  | { kind: "Stack"; items: Value[] }
  | { kind: "Queue"; items: Value[] }
  | { kind: "BinaryTree"; root: Value | null }
  | { kind: "TreeNode"; value: Value; left: Value | null; right: Value | null }
  | { kind: "Function"; name: string; params: string[]; body: any }
  | { kind: "Object"; props: Record<string, Value> };

export type StackFrame = {
  name: string;
  locals: Record<string, Value>;
};

export type ExecutionState = {
  stack: StackFrame[];
  console: string[];
  currentLine: number;
  heap: Record<string, HeapObject>;
  heapSeq: number;
};

export type Step = {
  label: string;
  state: ExecutionState;
};

export type RunResult = {
  steps: Step[];
  error: string | null;
};

export type StepSnapshot = ExecutionState;

function cloneValue(v: Value): Value {
  if (v && typeof v === "object" && "$ref" in v) return { $ref: v.$ref };
  return v;
}

function cloneHeapObject(o: HeapObject): HeapObject {
  if (o.kind === "Array") return { kind: "Array", items: o.items.map(cloneValue) };
  if (o.kind === "Stack") return { kind: "Stack", items: o.items.map(cloneValue) };
  if (o.kind === "Queue") return { kind: "Queue", items: o.items.map(cloneValue) };
  if (o.kind === "BinaryTree") return { kind: "BinaryTree", root: o.root ? cloneValue(o.root) : null };
  if (o.kind === "TreeNode")
    return { kind: "TreeNode", value: cloneValue(o.value), left: o.left ? cloneValue(o.left) : null, right: o.right ? cloneValue(o.right) : null };
  if (o.kind === "Function") return { kind: "Function", name: o.name, params: [...o.params], body: o.body };
  return { kind: "Object", props: Object.fromEntries(Object.entries(o.props).map(([k, v]) => [k, cloneValue(v)])) };
}

export function stepSnapShot(state: ExecutionState): StepSnapshot {
  return {
    currentLine: state.currentLine,
    heapSeq: state.heapSeq,
    console: [...state.console],
    stack: state.stack.map((f) => ({
      name: f.name,
      locals: Object.fromEntries(Object.entries(f.locals).map(([k, v]) => [k, cloneValue(v)])),
    })),
    heap: Object.fromEntries(Object.entries(state.heap).map(([id, obj]) => [id, cloneHeapObject(obj)])),
  };
}
