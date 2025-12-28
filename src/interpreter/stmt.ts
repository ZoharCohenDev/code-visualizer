import type { AnyNode } from "../engine/parse";
import type { ExecutionState, Step, Value } from "../engine/types";
import { nodeLine } from "./ast";
import { globals, pushStep, valueToString } from "./state";
import { evalExpr, execUpdateExpr, setAssignable } from "./expr";

type ReturnSignal = { __return: true; value: Value };
type BreakSignal = { __break: true };
type ContinueSignal = { __continue: true };

function asBool(v: Value): boolean {
  return !!v;
}

function tick(maxOps: { n: number }) {
  if (maxOps.n <= 0) throw new Error("Stopped: too many operations (possible infinite loop)");
  maxOps.n -= 1;
}

function runBlock(node: AnyNode, state: ExecutionState, steps: Step[], maxOps: { n: number }) {
  if (!node) return;

  if (node.type === "BlockStatement") {
    for (const s of node.body) execStatement(s, state, steps, maxOps);
    return;
  }

  execStatement(node, state, steps, maxOps);
}

function callLabel(node: AnyNode): string {
  if (!node) return "call";
  const callee = node.callee;

  if (callee?.type === "Identifier") return `call ${callee.name}()`;

  if (callee?.type === "MemberExpression") {
    const prop = callee.property?.name;
    if (prop) return `call .${prop}()`;
    return "call method";
  }

  return "call";
}

export function execStatement(node: AnyNode, state: ExecutionState, steps: Step[], maxOps: { n: number }) {
  if (!node) return;

  tick(maxOps);

  state.currentLine = nodeLine(node);

  if (node.type === "BlockStatement") {
    runBlock(node, state, steps, maxOps);
    return;
  }

  if (node.type === "EmptyStatement") {
    pushStep(steps, state, "empty");
    return;
  }

  if (node.type === "BreakStatement") {
    pushStep(steps, state, "break");
    throw { __break: true } as BreakSignal;
  }

  if (node.type === "ContinueStatement") {
    pushStep(steps, state, "continue");
    throw { __continue: true } as ContinueSignal;
  }

  if (node.type === "VariableDeclaration") {
    const frame = globals(state);
    for (const decl of node.declarations) {
      const name = decl.id?.name;
      if (!name) throw new Error("Only simple identifiers are supported in declarations");
      const value = decl.init ? evalExpr(decl.init, state, steps, maxOps) : undefined;
      frame.locals[name] = value;
      pushStep(steps, state, `${node.kind} ${name} = ${valueToString(state, value)}`);
    }
    return;
  }

  if (node.type === "FunctionDeclaration") {
    const frame = globals(state);
    const name = node.id?.name;
    if (!name) throw new Error("Function must have a name");
    const params = (node.params || []).map((p: AnyNode) => p.name);
    const fnRef = { $ref: `h${state.heapSeq}` };
    state.heapSeq += 1;
    state.heap[fnRef.$ref] = { kind: "Function", name, params, body: node.body };
    frame.locals[name] = fnRef;
    pushStep(steps, state, `function ${name}(${params.join(",")})`);
    return;
  }

  if (node.type === "ReturnStatement") {
    const v = node.argument ? evalExpr(node.argument, state, steps, maxOps) : undefined;
    pushStep(steps, state, `return ${valueToString(state, v)}`);
    throw { __return: true, value: v } as ReturnSignal;
  }

  if (node.type === "ExpressionStatement") {
    execStatement(node.expression, state, steps, maxOps);
    return;
  }

  if (node.type === "CallExpression") {
    const v = evalExpr(node, state, steps, maxOps);
    pushStep(steps, state, `${callLabel(node)} -> ${valueToString(state, v)}`);
    return;
  }

  if (node.type === "UpdateExpression") {
    const v = execUpdateExpr(node, state);
    pushStep(steps, state, `update -> ${valueToString(state, v)}`);
    return;
  }

  if (node.type === "AssignmentExpression") {
    const right = evalExpr(node.right, state, steps, maxOps);

    if (node.operator === "=") {
      setAssignable(node.left, state, right, steps, maxOps);
      pushStep(steps, state, `assign -> ${valueToString(state, right)}`);
      return;
    }

    const leftVal = evalExpr(node.left, state, steps, maxOps);

    if (node.operator === "+=") {
      const v = (leftVal as any) + (right as any);
      setAssignable(node.left, state, v, steps, maxOps);
      pushStep(steps, state, `+= -> ${valueToString(state, v)}`);
      return;
    }

    if (node.operator === "-=") {
      const v = (leftVal as any) - (right as any);
      setAssignable(node.left, state, v, steps, maxOps);
      pushStep(steps, state, `-= -> ${valueToString(state, v)}`);
      return;
    }

    throw new Error(`Unsupported assignment operator: ${node.operator}`);
  }

  if (node.type === "IfStatement") {
    const testVal = evalExpr(node.test, state, steps, maxOps);
    const isTrue = asBool(testVal);
    pushStep(steps, state, `if -> ${isTrue ? "true" : "false"}`);
    if (isTrue) runBlock(node.consequent, state, steps, maxOps);
    else if (node.alternate) runBlock(node.alternate, state, steps, maxOps);
    return;
  }

  if (node.type === "WhileStatement") {
    pushStep(steps, state, "while start");

    while (true) {
      tick(maxOps);

      state.currentLine = nodeLine(node.test);
      const testVal = evalExpr(node.test, state, steps, maxOps);
      const ok = asBool(testVal);
      pushStep(steps, state, `while test -> ${ok ? "true" : "false"}`);
      if (!ok) break;

      try {
        runBlock(node.body, state, steps, maxOps);
      } catch (e: any) {
        if (e && e.__break) break;
        if (e && e.__continue) continue;
        throw e;
      }
    }

    state.currentLine = nodeLine(node);
    pushStep(steps, state, "while end");
    return;
  }

  if (node.type === "DoWhileStatement") {
    pushStep(steps, state, "do while start");

    while (true) {
      tick(maxOps);

      try {
        runBlock(node.body, state, steps, maxOps);
      } catch (e: any) {
        if (e && e.__break) break;
        if (e && e.__continue) {
          // ממשיכים ישר לבדיקה
        } else if (e) {
          throw e;
        }
      }

      state.currentLine = nodeLine(node.test);
      const testVal = evalExpr(node.test, state, steps, maxOps);
      const ok = asBool(testVal);
      pushStep(steps, state, `do while test -> ${ok ? "true" : "false"}`);
      if (!ok) break;
    }

    state.currentLine = nodeLine(node);
    pushStep(steps, state, "do while end");
    return;
  }

  if (node.type === "ForStatement") {
    pushStep(steps, state, "for start");

    if (node.init) {
      execStatement(node.init, state, steps, maxOps);
    }

    while (true) {
      tick(maxOps);

      if (node.test) {
        state.currentLine = nodeLine(node.test);
        const t = evalExpr(node.test, state, steps, maxOps);
        const ok = asBool(t);
        pushStep(steps, state, `for test -> ${ok ? "true" : "false"}`);
        if (!ok) break;
      }

      let shouldContinue = false;

      try {
        runBlock(node.body, state, steps, maxOps);
      } catch (e: any) {
        if (e && e.__break) break;
        if (e && e.__continue) shouldContinue = true;
        else throw e;
      }

      if (node.update) {
        execStatement(node.update, state, steps, maxOps);
      }

      if (shouldContinue) continue;
    }

    state.currentLine = nodeLine(node);
    pushStep(steps, state, "for end");
    return;
  }

  throw new Error(`Unsupported statement: ${node.type}`);
}

export function execFunctionBody(body: AnyNode, state: ExecutionState, steps: Step[], maxOps: { n: number }): Value {
  try {
    runBlock(body, state, steps, maxOps);
    return undefined;
  } catch (e: any) {
    if (e && e.__return) return e.value;
    throw e;
  }
}
