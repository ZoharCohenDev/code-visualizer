// engine/types.ts
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
  | { kind: "Object"; props: Record<string, Value> }
  | { kind: "Class"; name: string; superClass: Value | null; methods: Record<string, Value> }
  | { kind: "Instance"; classRef: Value; props: Record<string, Value>; propOrigin: Record<string, string> }
  | { kind: "CallTrace"; root: Value | null; current: Value | null }
  | {
      kind: "CallNode";
      fnName: string;
      atLine: number;
      args: Value[];
      depth: number;
      children: Value[];
      status: "active" | "done";
      returnValue: Value;
    };

export type StackFrame = { name: string; locals: Record<string, Value> };

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

function cloneValue(v: Value): Value {
  if (v && typeof v === "object" && "$ref" in v) return { $ref: (v as Ref).$ref };
  return v;
}

function cloneHeapObject(obj: HeapObject): HeapObject {
  switch (obj.kind) {
    case "Array":
      return { kind: "Array", items: obj.items.map(cloneValue) };
    case "Stack":
      return { kind: "Stack", items: obj.items.map(cloneValue) };
    case "Queue":
      return { kind: "Queue", items: obj.items.map(cloneValue) };
    case "BinaryTree":
      return { kind: "BinaryTree", root: obj.root ? cloneValue(obj.root) : null };
    case "TreeNode":
      return {
        kind: "TreeNode",
        value: cloneValue(obj.value),
        left: obj.left ? cloneValue(obj.left) : null,
        right: obj.right ? cloneValue(obj.right) : null,
      };
    case "Function":
      return { kind: "Function", name: obj.name, params: [...obj.params], body: obj.body };
    case "Object":
      return {
        kind: "Object",
        props: Object.fromEntries(Object.entries(obj.props).map(([k, v]) => [k, cloneValue(v)])),
      };
    case "Class":
      return {
        kind: "Class",
        name: obj.name,
        superClass: obj.superClass ? cloneValue(obj.superClass) : null,
        methods: Object.fromEntries(Object.entries(obj.methods).map(([k, v]) => [k, cloneValue(v)])),
      };
    case "Instance":
      return {
        kind: "Instance",
        classRef: cloneValue(obj.classRef),
        props: Object.fromEntries(Object.entries(obj.props).map(([k, v]) => [k, cloneValue(v)])),
        propOrigin: { ...obj.propOrigin },
      };
    case "CallTrace":
      return {
        kind: "CallTrace",
        root: obj.root ? cloneValue(obj.root) : null,
        current: obj.current ? cloneValue(obj.current) : null,
      };
    case "CallNode":
      return {
        kind: "CallNode",
        fnName: obj.fnName,
        atLine: obj.atLine,
        args: obj.args.map(cloneValue),
        depth: obj.depth,
        children: obj.children.map(cloneValue),
        status: obj.status,
        returnValue: cloneValue(obj.returnValue),
      };
    default:
      return obj;
  }
}

export function stepSnapShot(state: ExecutionState): ExecutionState {
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
