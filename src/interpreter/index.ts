import type { ExecutionState, Step, RunResult, Value } from "../engine/types";
import { parseProgram } from "../engine/parse";
import { pushStep, globals, deref, isRef } from "./state";
import { execStatement, execFunctionBody } from "./stmt";

export function runCodeToSteps(code: string): RunResult {
  const steps: Step[] = [];
  const state: ExecutionState = {
    stack: [{ name: "global", locals: {} }],
    console: [],
    currentLine: 1,
    heap: {},
    heapSeq: 1,
  };

  const maxOps = { n: 5000 };

  try {
    const ast = parseProgram(code);

    pushStep(steps, state, "Start");

    for (const stmt of ast.body) {
      execStatement(stmt, state, steps, maxOps);
    }

    pushStep(steps, state, "Done");
    return { steps, error: null };
  } catch (e: any) {
    if (e && e.__break) return { steps, error: "break used outside a loop" };
    if (e && e.__continue) return { steps, error: "continue used outside a loop" };
    return { steps, error: e?.message || "Unknown error" };
  }
}

export function callUserFunctionByName(
  state: ExecutionState,
  steps: Step[],
  name: string,
  args: Value[],
  maxOps: { n: number } = { n: 5000 }
) {
  const frame = globals(state);
  const fnV = frame.locals[name];
  if (!fnV) throw new Error(`Undefined function: ${name}`);
  if (!isRef(fnV)) throw new Error(`${name} is not a function ref`);
  const fnObj = deref(state, fnV);
  if (fnObj.kind !== "Function") throw new Error(`${name} is not a function`);

  const newFrame = { name, locals: {} as Record<string, Value> };
  for (let i = 0; i < fnObj.params.length; i++) {
    newFrame.locals[fnObj.params[i]] = args[i];
  }

  state.stack.push(newFrame);
  pushStep(steps, state, `enter ${name}`);
  const ret = execFunctionBody(fnObj.body, state, steps, maxOps);
  state.stack.pop();
  pushStep(steps, state, `exit ${name}`);
  return ret;
}
