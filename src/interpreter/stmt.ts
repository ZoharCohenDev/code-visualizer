import type { AnyNode } from "../engine/parse";
import type { ExecutionState, Step, Value } from "../engine/types";
import { nodeLine } from "./ast";
import { globals, pushStep } from "./state";
import { evalExpr, execUpdateExpr, setAssignable } from "./expr";

type ReturnSignal = { __return: true; value: Value };

function asBool(v: Value): boolean {
  return !!v;
}

function runBlock(node: AnyNode, state: ExecutionState, steps: Step[], maxOps: { n: number }) {
  if (!node) return;

  if (node.type === "BlockStatement") {
    for (const s of node.body) execStatement(s, state, steps, maxOps);
    return;
  }

  execStatement(node, state, steps, maxOps);
}

export function execStatement(node: AnyNode, state: ExecutionState, steps: Step[], maxOps: { n: number }) {
  if (!node) return;

  if (maxOps.n <= 0) throw new Error("Stopped: too many operations (possible infinite loop)");
  maxOps.n -= 1;

  state.currentLine = nodeLine(node);

  if (node.type === "BlockStatement") {
    runBlock(node, state, steps, maxOps);
    return;
  }

  if (node.type === "VariableDeclaration") {
    const frame = globals(state);
    for (const decl of node.declarations) {
      const name = decl.id?.name;
      if (!name) throw new Error("Only simple identifiers are supported in declarations");
      const value = decl.init ? evalExpr(decl.init, state) : undefined;
      frame.locals[name] = value;
      pushStep(steps, state, `${node.kind} ${name} = ${String(value)}`);
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
    const v = node.argument ? evalExpr(node.argument, state) : undefined;
    pushStep(steps, state, `return ${String(v)}`);
    throw { __return: true, value: v } as ReturnSignal;
  }

  if (node.type === "ExpressionStatement") {
    execStatement(node.expression, state, steps, maxOps);
    return;
  }

  if (node.type === "CallExpression") {
    evalExpr(node, state);
    pushStep(steps, state, `call`);
    return;
  }

  if (node.type === "UpdateExpression") {
    const v = execUpdateExpr(node, state);
    pushStep(steps, state, `update -> ${String(v)}`);
    return;
  }

  if (node.type === "AssignmentExpression") {
    const right = evalExpr(node.right, state);

    if (node.operator === "=") {
      setAssignable(node.left, state, right);
      pushStep(steps, state, `assign`);
      return;
    }

    const leftVal = evalExpr(node.left, state);

    if (node.operator === "+=") {
      // @ts-ignore
      const v = (leftVal as any) + (right as any);
      setAssignable(node.left, state, v);
      pushStep(steps, state, `+=`);
      return;
    }

    if (node.operator === "-=") {
      // @ts-ignore
      const v = (leftVal as any) - (right as any);
      setAssignable(node.left, state, v);
      pushStep(steps, state, `-=`);
      return;
    }

    throw new Error(`Unsupported assignment operator: ${node.operator}`);
  }

  if (node.type === "IfStatement") {
    const testVal = evalExpr(node.test, state);
    const isTrue = asBool(testVal);
    pushStep(steps, state, `if -> ${isTrue ? "true" : "false"}`);
    if (isTrue) runBlock(node.consequent, state, steps, maxOps);
    else if (node.alternate) runBlock(node.alternate, state, steps, maxOps);
    return;
  }

  if (node.type === "WhileStatement") {
    pushStep(steps, state, "while start");
    while (true) {
      const testVal = evalExpr(node.test, state);
      const ok = asBool(testVal);
      pushStep(steps, state, `while test -> ${ok ? "true" : "false"}`);
      if (!ok) break;
      runBlock(node.body, state, steps, maxOps);
    }
    pushStep(steps, state, "while end");
    return;
  }

  if (node.type === "ForStatement") {
    pushStep(steps, state, "for start");

    if (node.init) {
      execStatement(node.init, state, steps, maxOps);
    }

    while (true) {
      if (node.test) {
        const t = evalExpr(node.test, state);
        const ok = asBool(t);
        pushStep(steps, state, `for test -> ${ok ? "true" : "false"}`);
        if (!ok) break;
      }

      runBlock(node.body, state, steps, maxOps);

      if (node.update) {
        if (node.update.type === "UpdateExpression") execStatement(node.update, state, steps, maxOps);
        else evalExpr(node.update, state);
        pushStep(steps, state, "for update");
      }
    }

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
