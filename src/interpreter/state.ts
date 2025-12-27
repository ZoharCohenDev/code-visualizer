import type { ExecutionState, Step, Value, HeapObject } from "../engine/types";
import { stepSnapShot } from "../engine/types";
//מחזיר את המסגרת הפעילה כרגע
export function globals(state: ExecutionState) {
  return state.stack[state.stack.length - 1];
}
//בודק האם הערך הוא הפניה לאובייקט בערימת הזיכרון
export function isRef(v: Value): v is { $ref: string } {
  return !!v && typeof v === "object" && "$ref" in v;
}
//מקצה אובייקט חדש בערימת הזיכרון ומחזיר הפניה אליו
export function alloc(state: ExecutionState, obj: HeapObject): Value {
  const id = `h${state.heapSeq}`;
  state.heapSeq += 1;
  state.heap[id] = obj;
  return { $ref: id };
}
// מחזיר את האובייקט בערימת הזיכרון שאליו מפנה ההפניה (האמיתי)
export function deref(state: ExecutionState, v: Value): HeapObject {
  if (!isRef(v)) throw new Error("Tried to deref non-ref");
  const obj = state.heap[v.$ref];
  if (!obj) throw new Error(`Invalid ref: ${v.$ref}`);
  return obj;
}
//שומר את מצב ההרצה הנוכחי עם תווית מסוימת ברשימת השלבים
export function pushStep(steps: Step[], state: ExecutionState, label: string) {
  steps.push({ label, state: stepSnapShot(state) });
}
//מחזיר מחרוזת יפה המייצגת את הערך הנתון
export function valueToString(state: ExecutionState, v: Value): string {
  if (isRef(v)) {
    const o = state.heap[v.$ref];
    if (!o) return "[ref]";
    if (o.kind === "Array") return `[${o.items.map((x) => valueToString(state, x)).join(", ")}]`;
    if (o.kind === "Stack") return `Stack(${o.items.map((x) => valueToString(state, x)).join(", ")})`;
    if (o.kind === "Queue") return `Queue(${o.items.map((x) => valueToString(state, x)).join(", ")})`;
    if (o.kind === "BinaryTree") return `BinaryTree(${o.root ? valueToString(state, o.root) : "empty"})`;
    if (o.kind === "TreeNode") return `Node(${valueToString(state, o.value)})`;
    if (o.kind === "Function") return `function ${o.name}()`;
    return `Object(${Object.keys(o.props).length})`;
  }
  return String(v);
}
