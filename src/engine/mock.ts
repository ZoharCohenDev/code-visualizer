import type { ExecutionState, Step } from "./types";
import { stepSnapShot } from "./types";
// מצב פתיחה לדוגמה של הרצת קוד
const base: ExecutionState = {
  stack: [{ name: "global", locals: {} }],
  console: [],
  currentLine: 1,
  heap: {},
  heapSeq: 1,
};
// סדרת צעדים לדוגמה של הרצת קוד
export const MOCK_STEPS: Step[] = [
  { label: "Start", state: stepSnapShot(base) },
  {
    label: "let s = Stack()",
    state: stepSnapShot({
      ...base,
      stack: [{ name: "global", locals: { s: { $ref: "h1" } } }],
      heap: { h1: { kind: "Stack", items: [] } },
      heapSeq: 2,
    }),
  },
  {
    label: "s.push(1)",
    state: stepSnapShot({
      ...base,
      stack: [{ name: "global", locals: { s: { $ref: "h1" } } }],
      heap: { h1: { kind: "Stack", items: [1] } },
      heapSeq: 2,
    }),
  },
];
