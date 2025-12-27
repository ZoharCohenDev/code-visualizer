//משתנה יחיד כמו let
export type Primitive = string | number | boolean | null | undefined;
//הפניה לאובייקט כמו מחסנית/תור/עץ
export type Ref = { $ref: string };
//ערך יכול להיות פרימיטיבי או הפניה
export type Value = Primitive | Ref;
//האופציות של האובייקטים
export type HeapObject =
  | { kind: "Array"; items: Value[] }
  | { kind: "Stack"; items: Value[] }
  | { kind: "Queue"; items: Value[] }
  | { kind: "BinaryTree"; root: Value | null }
  | { kind: "TreeNode"; value: Value; left: Value | null; right: Value | null }
  | { kind: "Function"; name: string; params: string[]; body: any }
  | { kind: "Object"; props: Record<string, Value> };
//באיזה פונקציה אני נמצא , שמירת המצב של אותו פונקציה
export type StackFrame = {
  name: string;
  locals: Record<string, Value>;
};
//כל מה שאני צריך לדעת כדי לצייר את המסך של צעד אחד
export type ExecutionState = {
  stack: StackFrame[];
  console: string[];
  currentLine: number;
  heap: Record<string, HeapObject>;
  heapSeq: number;
};
//צעד אחד של הריצה
export type Step = {
  label: string;
  state: ExecutionState;
};
//הרצה של התכנית  עד השבירה שלה או הסיום שלה
export type RunResult = {
  steps: Step[];
  error: string | null;
};
//שם אחר ל ExecutionState
export type StepSnapshot = ExecutionState;
//פונקציות לשכפול ערכים ואובייקטים כדי למנוע שינוי במצב המקורי
function cloneValue(v: Value): Value {
  if (v && typeof v === "object" && "$ref" in v) return { $ref: v.$ref };
  return v;
}
//שעפול עמוק לאובייקטים של ההיפ , כדי שכל סטפ באמת ישמור תמונת מצב שלא משתנה אחר כך
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
//פונקציה שיוצרת snapshot של מצב הריצה הנוכחי
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
