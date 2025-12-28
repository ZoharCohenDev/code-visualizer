// interpreter/stmt.ts
import type { AnyNode } from "../engine/parse";
import type { ExecutionState, Step, Value } from "../engine/types";
import { nodeLine } from "./ast";
import { globals, isRef, pushStep, valueToString } from "./state";
import { evalExpr, execUpdateExpr } from "./expr";

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

  if (node.type === "ExpressionStatement") {
    evalExpr(node.expression, state, steps, maxOps);
    pushStep(steps, state, callLabel(node.expression));
    return;
  }

  if (node.type === "VariableDeclaration") {
    const frame = globals(state);
    for (const d of node.declarations) {
      const name = d.id?.name;
      if (!name) throw new Error("Unsupported declaration");
      const value = d.init ? evalExpr(d.init, state, steps, maxOps) : undefined;
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
    state.heap[fnRef.$ref] = { kind: "Function", name, params, body: node.body } as any;
    frame.locals[name] = fnRef;
    pushStep(steps, state, `function ${name}(${params.join(",")})`);
    return;
  }

  if (node.type === "ClassDeclaration") {
    const frame = globals(state);
    const name = node.id?.name;
    if (!name) throw new Error("Class must have a name");

    let superClass: Value | null = null;
    if (node.superClass) {
      if (node.superClass.type !== "Identifier") throw new Error("Only extends Identifier is supported");
      const supName = node.superClass.name;
      const v = frame.locals[supName];
      if (!v || !isRef(v)) throw new Error(`Unknown superclass: ${supName}`);
      superClass = v;
    }

    const classRef = { $ref: `h${state.heapSeq}` };
    state.heapSeq += 1;

    const methods: Record<string, Value> = {};
    const bodyItems = (node.body?.body || []) as AnyNode[];

    for (const it of bodyItems) {
      if (it.type !== "MethodDefinition") continue;
      const key = it.key;
      const methodName = key?.name ?? key?.value;
      const fn = it.value;
      if (!methodName || !fn) continue;
      const params = (fn.params || []).map((p: AnyNode) => p.name);
      const fnRef = { $ref: `h${state.heapSeq}` };
      state.heapSeq += 1;
      state.heap[fnRef.$ref] = { kind: "Function", name: `${name}.${String(methodName)}`, params, body: fn.body } as any;
      methods[String(methodName)] = fnRef;
    }

    state.heap[classRef.$ref] = { kind: "Class", name, superClass, methods } as any;
    frame.locals[name] = classRef;
    pushStep(steps, state, superClass ? `class ${name} extends ...` : `class ${name}`);
    return;
  }

  if (node.type === "ReturnStatement") {
    const v = node.argument ? evalExpr(node.argument, state, steps, maxOps) : undefined;
    pushStep(steps, state, `return ${valueToString(state, v)}`);
    throw { __return: true, value: v } as ReturnSignal;
  }

  if (node.type === "IfStatement") {
    const test = evalExpr(node.test, state, steps, maxOps);
    pushStep(steps, state, `if (${valueToString(state, test)})`);
    if (asBool(test)) runBlock(node.consequent, state, steps, maxOps);
    else if (node.alternate) runBlock(node.alternate, state, steps, maxOps);
    return;
  }

  if (node.type === "BlockStatement") {
    for (const s of node.body) execStatement(s, state, steps, maxOps);
    return;
  }

  if (node.type === "WhileStatement") {
    pushStep(steps, state, "while start");
    while (asBool(evalExpr(node.test, state, steps, maxOps))) {
      try {
        runBlock(node.body, state, steps, maxOps);
      } catch (e: any) {
        if (e && e.__break) break;
        if (e && e.__continue) continue;
        throw e;
      }
      tick(maxOps);
    }
    pushStep(steps, state, "while end");
    return;
  }

  if (node.type === "ForStatement") {
    if (node.init) {
      if (node.init.type === "VariableDeclaration") execStatement(node.init, state, steps, maxOps);
      else evalExpr(node.init, state, steps, maxOps);
    }

    pushStep(steps, state, "for start");
    while (node.test ? asBool(evalExpr(node.test, state, steps, maxOps)) : true) {
      try {
        runBlock(node.body, state, steps, maxOps);
      } catch (e: any) {
        if (e && e.__break) break;
        if (e && e.__continue) {
          if (node.update) evalExpr(node.update, state, steps, maxOps);
          continue;
        }
        throw e;
      }

      if (node.update) evalExpr(node.update, state, steps, maxOps);
      tick(maxOps);
    }
    pushStep(steps, state, "for end");
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

  if (node.type === "UpdateExpression") {
    execUpdateExpr(node, state);
    pushStep(steps, state, node.operator);
    return;
  }

  if (node.type === "AssignmentExpression") {
    evalExpr(node, state, steps, maxOps);
    pushStep(steps, state, node.operator);
    return;
  }

  if (node.type === "EmptyStatement") return;

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
