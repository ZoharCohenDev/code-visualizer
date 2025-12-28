// interpreter/state.ts
import type { ExecutionState, Step, Value, HeapObject } from "../engine/types";
import { stepSnapShot } from "../engine/types";

export function globals(state: ExecutionState) {
  return state.stack[state.stack.length - 1];
}

export function isRef(v: Value): v is { $ref: string } {
  return !!v && typeof v === "object" && "$ref" in v;
}

export function deref(state: ExecutionState, v: Value): HeapObject {
  if (!isRef(v)) throw new Error("Tried to deref non-ref");
  const o = state.heap[v.$ref];
  if (!o) throw new Error("Dangling ref");
  return o;
}

export function alloc(state: ExecutionState, obj: HeapObject): Value {
  const id = `h${state.heapSeq}`;
  state.heapSeq += 1;
  state.heap[id] = obj;
  return { $ref: id };
}

export function pushStep(steps: Step[], state: ExecutionState, label: string) {
  steps.push({ label, state: stepSnapShot(state) });
}

export function valueToString(state: ExecutionState, v: Value): string {
  if (isRef(v)) {
    const o = (state.heap as any)[v.$ref] as any;

    if (!o) return "[ref]";
    if (o.kind === "Array") return `[${(o.items as Value[]).map((x) => valueToString(state, x)).join(", ")}]`;
    if (o.kind === "Stack") return `Stack(${(o.items as Value[]).map((x) => valueToString(state, x)).join(", ")})`;
    if (o.kind === "Queue") return `Queue(${(o.items as Value[]).map((x) => valueToString(state, x)).join(", ")})`;
    if (o.kind === "BinaryTree") return `BinaryTree(${o.root ? valueToString(state, o.root) : "empty"})`;
    if (o.kind === "TreeNode") return `Node(${valueToString(state, o.value)})`;
    if (o.kind === "Function") return `function ${o.name}()`;
    if (o.kind === "Class") return `class ${o.name}`;

    if (o.kind === "Instance") {
      const cls = isRef(o.classRef) ? ((state.heap as any)[o.classRef.$ref] as any) : null;
      const name = cls && cls.kind === "Class" ? cls.name : "Instance";
      return `${name} instance`;
    }

    if (o.kind === "CallTrace") return "CallTrace";
    if (o.kind === "CallNode") return `Call(${o.fnName})`;
    if (o.kind === "Object") return `Object(${Object.keys(o.props || {}).length})`;

    return String(o.kind);
  }

  return String(v);
}

