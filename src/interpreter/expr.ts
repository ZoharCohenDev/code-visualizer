// interpreter/expr.ts
import type { AnyNode } from "../engine/parse";
import type { ExecutionState, Step, Value } from "../engine/types";
import { alloc, deref, isRef, pushStep, valueToString } from "./state";
import { nodeLine } from "./ast";
import { execFunctionBody } from "./stmt";

const MAX_CALL_DEPTH = 200;

function findFrame(state: ExecutionState, name: string) {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    const f = state.stack[i];
    if (name in f.locals) return f;
  }
  return null;
}

function getId(state: ExecutionState, name: string): Value {
  const f = findFrame(state, name);
  if (!f) throw new Error(`Undefined identifier: ${name}`);
  return f.locals[name];
}

function setId(state: ExecutionState, name: string, v: Value) {
  const f = findFrame(state, name);
  if (!f) throw new Error(`Undefined identifier: ${name}`);
  f.locals[name] = v;
}

function asNumber(v: Value): number {
  if (typeof v !== "number") throw new Error("Expected number");
  return v;
}

function resolveClass(state: ExecutionState, classRef: Value) {
  if (!isRef(classRef)) return null;
  const o = state.heap[classRef.$ref] as any;
  return o && o.kind === "Class" ? o : null;
}

function resolveMethodRef(state: ExecutionState, classRef: Value, methodName: string): Value | null {
  let cur: Value | null = classRef;
  while (cur) {
    const c = resolveClass(state, cur);
    if (!c) return null;
    const m = c.methods?.[methodName];
    if (m) return m;
    cur = (c.superClass as any) ?? null;
  }
  return null;
}

function currentClassName(state: ExecutionState): string {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    const v = state.stack[i].locals["__className"];
    if (typeof v === "string") return v;
  }
  return "";
}

function currentSuperClassRef(state: ExecutionState): Value | null {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    const v = state.stack[i].locals["__superClass"];
    if (v && (typeof v === "object" || v === null)) return v as any;
  }
  return null;
}

function currentThis(state: ExecutionState): Value {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    if ("this" in state.stack[i].locals) return state.stack[i].locals["this"];
  }
  throw new Error("this used outside of a method/constructor");
}

function ensureCallTrace(state: ExecutionState) {
  for (const [id, o] of Object.entries(state.heap)) {
    if ((o as any).kind === "CallTrace") return { ref: { $ref: id }, obj: o as any };
  }
  const ref = { $ref: `h${state.heapSeq}` };
  state.heapSeq += 1;
  state.heap[ref.$ref] = { kind: "CallTrace", root: null, current: null } as any;
  return { ref, obj: state.heap[ref.$ref] as any };
}

function invokeFunctionRef(
  state: ExecutionState,
  steps: Step[],
  maxOps: { n: number },
  fnRef: Value,
  fnDisplayName: string,
  args: Value[],
  atLine: number,
  thisVal?: Value,
  classRef?: Value,
  superClass?: Value | null
): Value {
  if (!isRef(fnRef)) throw new Error(`${fnDisplayName} is not a function ref`);
  const fnObj = deref(state, fnRef) as any;
  if (!fnObj || fnObj.kind !== "Function") throw new Error(`${fnDisplayName} is not a function`);

  const trace = ensureCallTrace(state).obj;

  const callNodeRef = { $ref: `h${state.heapSeq}` };
  state.heapSeq += 1;

  state.heap[callNodeRef.$ref] = {
    kind: "CallNode",
    fnName: fnDisplayName,
    atLine,
    args: [...args],
    depth: state.stack.length,
    children: [],
    status: "active",
    returnValue: undefined,
  } as any;

  if (trace.current && isRef(trace.current)) {
    const parent = state.heap[(trace.current as any).$ref] as any;
    if (parent && parent.kind === "CallNode") parent.children.push(callNodeRef);
  } else if (!trace.root) {
    trace.root = callNodeRef;
  }

  const prevCurrent = trace.current;
  trace.current = callNodeRef;

  const newFrame = { name: fnDisplayName, locals: {} as Record<string, Value> };
  for (let i = 0; i < fnObj.params.length; i++) newFrame.locals[fnObj.params[i]] = args[i];

  if (thisVal !== undefined) newFrame.locals["this"] = thisVal;
  if (classRef !== undefined) {
    newFrame.locals["__classRef"] = classRef;
    const c = resolveClass(state, classRef);
    newFrame.locals["__className"] = c?.name ?? "";
  }
  if (superClass !== undefined) newFrame.locals["__superClass"] = superClass;

  if (state.stack.length >= MAX_CALL_DEPTH) throw new Error(`Stopped: max call depth (${MAX_CALL_DEPTH}) exceeded`);

  state.stack.push(newFrame);
  state.currentLine = atLine;
  pushStep(steps, state, `enter ${fnDisplayName}`);

  const ret = execFunctionBody(fnObj.body, state, steps, maxOps);

  state.stack.pop();

  const callNode = state.heap[callNodeRef.$ref] as any;
  if (callNode && callNode.kind === "CallNode") {
    callNode.status = "done";
    callNode.returnValue = ret;
  }

  trace.current = prevCurrent ?? null;

  state.currentLine = atLine;
  pushStep(steps, state, `exit ${fnDisplayName} -> ${valueToString(state, ret)}`);
  return ret;
}

function getMember(state: ExecutionState, objV: Value, prop?: string, key?: Value): Value {
  if (!isRef(objV)) throw new Error("Member access on non-object");
  const o = deref(state, objV) as any;

  if (o.kind === "Array") {
    const idx = asNumber(key ?? 0);
    return o.items[idx];
  }

  if (o.kind === "TreeNode") {
    if (prop === "value") return o.value;
    if (prop === "left") return o.left;
    if (prop === "right") return o.right;
    throw new Error("Unsupported member on TreeNode");
  }

  if (o.kind === "BinaryTree") {
    if (prop === "root") return o.root;
    throw new Error("Unsupported member on BinaryTree");
  }

  if (o.kind === "Object") {
    const k = prop ?? String(key);
    return o.props[k];
  }

  if (o.kind === "Instance") {
    const k = prop ?? String(key);
    if (k in o.props) return o.props[k];
    return undefined;
  }

  if (o.kind === "Class") {
    const k = prop ?? String(key);
    if (k === "name") return o.name;
    return undefined;
  }

  throw new Error("Unsupported member access");
}

function callMember(
  state: ExecutionState,
  objV: Value,
  propName: string,
  args: Value[],
  steps?: Step[],
  maxOps?: { n: number },
  atLine?: number
): Value {
  if (!isRef(objV)) throw new Error("Call on non-object");
  const o = deref(state, objV) as any;

  if (o.kind === "Stack") {
    if (propName === "push") {
      o.items.push(...args);
      return undefined;
    }
    if (propName === "pop") return o.items.pop() ?? undefined;
    if (propName === "peek") return o.items.length ? o.items[o.items.length - 1] : undefined;
    if (propName === "size") return o.items.length;
  }

  if (o.kind === "Queue") {
    if (propName === "enqueue") {
      o.items.push(...args);
      return undefined;
    }
    if (propName === "dequeue") return o.items.shift() ?? undefined;
    if (propName === "size") return o.items.length;
    if (propName === "peek") return o.items.length ? o.items[0] : undefined;
  }

  if (o.kind === "Array") {
    if (propName === "push") {
      o.items.push(...args);
      return o.items.length;
    }
    if (propName === "unshift") {
      o.items.unshift(...args);
      return o.items.length;
    }
    if (propName === "pop") return o.items.pop() ?? undefined;
    if (propName === "shift") return o.items.shift() ?? undefined;
    if (propName === "length") return o.items.length;
  }

  if (o.kind === "BinaryTree") {
    if (propName === "insert") {
      const v = args[0];
      const root = o.root;
      if (!root) {
        o.root = alloc(state, { kind: "TreeNode", value: v, left: null, right: null });
        return undefined;
      }

      let cur = root;
      while (isRef(cur)) {
        const n = deref(state, cur) as any;
        if (n.kind !== "TreeNode") break;
        const nv = asNumber(n.value);
        const vv = asNumber(v);
        if (vv < nv) {
          if (!n.left) {
            n.left = alloc(state, { kind: "TreeNode", value: v, left: null, right: null });
            return undefined;
          }
          cur = n.left;
        } else {
          if (!n.right) {
            n.right = alloc(state, { kind: "TreeNode", value: v, left: null, right: null });
            return undefined;
          }
          cur = n.right;
        }
      }
      return undefined;
    }

    if (propName === "contains") {
      const target = asNumber(args[0]);
      let cur = o.root;
      while (cur && isRef(cur)) {
        const n = deref(state, cur) as any;
        if (n.kind !== "TreeNode") break;
        const nv = asNumber(n.value);
        if (target === nv) return true;
        cur = target < nv ? n.left : n.right;
      }
      return false;
    }

    if (propName === "inOrder") {
      const out: Value[] = [];
      function walk(r: Value | null) {
        if (!r || !isRef(r)) return;
        const n = deref(state, r) as any;
        if (n.kind !== "TreeNode") return;
        walk(n.left);
        out.push(n.value);
        walk(n.right);
      }
      walk(o.root);
      return alloc(state, { kind: "Array", items: out });
    }
  }

  if (o.kind === "Instance") {
    if (!steps || !maxOps || !atLine) throw new Error("Method calls require steps/maxOps/line");
    const cls = resolveClass(state, o.classRef);
    const methodRef = resolveMethodRef(state, o.classRef, propName);
    if (!methodRef) throw new Error(`Method ${propName} not found on ${cls?.name ?? "instance"}`);
    return invokeFunctionRef(
      state,
      steps,
      maxOps,
      methodRef,
      `${cls?.name ?? "Instance"}.${propName}`,
      args,
      atLine,
      objV,
      o.classRef,
      cls?.superClass ?? null
    );
  }

  throw new Error(`Unsupported member call: ${propName}`);
}

function callUserFunction(state: ExecutionState, steps: Step[], maxOps: { n: number }, name: string, args: Value[], atLine: number): Value {
  const fnV = getId(state, name);
  if (!isRef(fnV)) throw new Error(`${name} is not a function ref`);
  return invokeFunctionRef(state, steps, maxOps, fnV, name, args, atLine);
}

export function evalExpr(node: AnyNode, state: ExecutionState, steps?: Step[], maxOps?: { n: number }): Value {
  if (!node) return undefined;

  if (node.type === "Literal") return node.value;

  if (node.type === "Identifier") return getId(state, node.name);

  if (node.type === "ThisExpression") return currentThis(state);

  if (node.type === "ArrayExpression") {
    const items: Value[] = (node.elements || []).map((e: AnyNode) => evalExpr(e, state, steps, maxOps));
    return alloc(state, { kind: "Array", items });
  }

  if (node.type === "ObjectExpression") {
    const props: Record<string, Value> = {};
    for (const p of node.properties || []) {
      const k = p.key?.name ?? p.key?.value;
      props[String(k)] = evalExpr(p.value, state, steps, maxOps);
    }
    return alloc(state, { kind: "Object", props });
  }

  if (node.type === "UnaryExpression") {
    const v = evalExpr(node.argument, state, steps, maxOps);
    if (node.operator === "!") return !v;
    if (node.operator === "-") return -asNumber(v);
    throw new Error(`Unsupported unary operator: ${node.operator}`);
  }

  if (node.type === "BinaryExpression" || node.type === "LogicalExpression") {
    const l = evalExpr(node.left, state, steps, maxOps);
    if (node.operator === "&&") return l ? evalExpr(node.right, state, steps, maxOps) : l;
    if (node.operator === "||") return l ? l : evalExpr(node.right, state, steps, maxOps);
    const r = evalExpr(node.right, state, steps, maxOps);

    switch (node.operator) {
      case "+":
        return (l as any) + (r as any);
      case "-":
        return asNumber(l) - asNumber(r);
      case "*":
        return asNumber(l) * asNumber(r);
      case "/":
        return asNumber(l) / asNumber(r);
      case "%":
        return asNumber(l) % asNumber(r);
      case "==":
        return (l as any) == (r as any);
      case "!=":
        return (l as any) != (r as any);
      case "===":
        return (l as any) === (r as any);
      case "!==":
        return (l as any) !== (r as any);
      case "<":
        return (l as any) < (r as any);
      case "<=":
        return (l as any) <= (r as any);
      case ">":
        return (l as any) > (r as any);
      case ">=":
        return (l as any) >= (r as any);
      default:
        throw new Error(`Unsupported operator: ${node.operator}`);
    }
  }

  if (node.type === "ConditionalExpression") {
    const t = evalExpr(node.test, state, steps, maxOps);
    return t ? evalExpr(node.consequent, state, steps, maxOps) : evalExpr(node.alternate, state, steps, maxOps);
  }

  if (node.type === "MemberExpression") {
    const objV = evalExpr(node.object, state, steps, maxOps);
    const computed = !!node.computed;
    const prop = computed ? undefined : node.property?.name;
    const key = computed ? evalExpr(node.property, state, steps, maxOps) : undefined;
    return getMember(state, objV, prop, key);
  }

  if (node.type === "AssignmentExpression") {
    if (!steps || !maxOps) throw new Error("AssignmentExpression requires steps/maxOps context");

    const op = node.operator;
    const left = node.left;
    const rightVal = evalExpr(node.right, state, steps, maxOps);

    if (op === "=") {
      setAssignable(left, state, rightVal, steps, maxOps);
      state.currentLine = nodeLine(node);
      pushStep(steps, state, `= ${valueToString(state, rightVal)}`);
      return rightVal;
    }

    const curVal =
      left.type === "Identifier" || left.type === "MemberExpression" ? evalExpr(left, state, steps, maxOps) : undefined;

    const lnum = asNumber(curVal);
    const rnum = asNumber(rightVal);

    let next: Value;
    switch (op) {
      case "+=":
        next = lnum + rnum;
        break;
      case "-=":
        next = lnum - rnum;
        break;
      case "*=":
        next = lnum * rnum;
        break;
      case "/=":
        next = lnum / rnum;
        break;
      case "%=":
        next = lnum % rnum;
        break;
      default:
        throw new Error(`Unsupported assignment operator: ${op}`);
    }

    setAssignable(left, state, next, steps, maxOps);
    state.currentLine = nodeLine(node);
    pushStep(steps, state, `${op} -> ${valueToString(state, next)}`);
    return next;
  }

  if (node.type === "NewExpression") {
    if (!steps || !maxOps) throw new Error("new requires steps/maxOps context");
    if (node.callee.type !== "Identifier") throw new Error("Only new ClassName(...) is supported");
    const classRef = getId(state, node.callee.name);
    const c = resolveClass(state, classRef);
    if (!c) throw new Error(`${node.callee.name} is not a class`);

    const instRef = alloc(state, { kind: "Instance", classRef, props: {}, propOrigin: {} } as any);

    const ctorRef = resolveMethodRef(state, classRef, "constructor");
    const args = (node.arguments || []).map((a: AnyNode) => evalExpr(a, state, steps, maxOps));
    if (ctorRef) {
      invokeFunctionRef(state, steps, maxOps, ctorRef, `${c.name}.constructor`, args, nodeLine(node), instRef, classRef, c.superClass ?? null);
    }
    return instRef;
  }

  if (node.type === "CallExpression") {
    const callee = node.callee;

    if (
      callee?.type === "MemberExpression" &&
      callee.object?.type === "Identifier" &&
      callee.object.name === "console" &&
      callee.property?.type === "Identifier" &&
      callee.property.name === "log"
    ) {
      const args: Value[] = ((node.arguments as AnyNode[]) || []).map((a: AnyNode) => evalExpr(a, state, steps, maxOps));
      const out = args.map((x: Value) => valueToString(state, x)).join(" ");
      state.console.push(out);
      return undefined;
    }

    if (callee?.type === "Super") {
      if (!steps || !maxOps) throw new Error("super() requires steps/maxOps context");
      const superClass = currentSuperClassRef(state);
      if (!superClass) throw new Error("super() used outside of a class");
      const ctorRef = resolveMethodRef(state, superClass, "constructor");
      if (!ctorRef) return undefined;
      const args = (node.arguments || []).map((a: AnyNode) => evalExpr(a, state, steps, maxOps));
      const sup = resolveClass(state, superClass);
      return invokeFunctionRef(state, steps, maxOps, ctorRef, `super.constructor`, args, nodeLine(node), currentThis(state), superClass, sup?.superClass ?? null);
    }

    if (callee?.type === "Identifier") {
      const name = callee.name;

      if (name === "Stack") return alloc(state, { kind: "Stack", items: [] });
      if (name === "Queue") return alloc(state, { kind: "Queue", items: [] });
      if (name === "BinaryTree") return alloc(state, { kind: "BinaryTree", root: null });

      const args: Value[] = ((node.arguments as AnyNode[]) || []).map((a: AnyNode) => evalExpr(a, state, steps, maxOps));
      if (!steps || !maxOps) throw new Error("Function calls require steps/maxOps context");
      return callUserFunction(state, steps, maxOps, name, args, nodeLine(node));
    }

    if (callee?.type === "MemberExpression") {
      if (!steps || !maxOps) throw new Error("Member calls require steps/maxOps context");

      if (callee.object?.type === "Super") {
        const superClass = currentSuperClassRef(state);
        if (!superClass) throw new Error("super used outside of a class");
        const prop = callee.computed ? String(evalExpr(callee.property, state, steps, maxOps)) : String(callee.property?.name);
        const methodRef = resolveMethodRef(state, superClass, prop);
        if (!methodRef) throw new Error(`super has no method ${prop}`);
        const args: Value[] = ((node.arguments as AnyNode[]) || []).map((a: AnyNode) => evalExpr(a, state, steps, maxOps));
        const sup = resolveClass(state, superClass);
        return invokeFunctionRef(state, steps, maxOps, methodRef, `super.${prop}`, args, nodeLine(node), currentThis(state), superClass, sup?.superClass ?? null);
      }

      const objV = evalExpr(callee.object, state, steps, maxOps);
      const propName = callee.computed ? String(evalExpr(callee.property, state, steps, maxOps)) : callee.property?.name;
      if (!propName) throw new Error("Only identifier methods are supported");
      const args: Value[] = ((node.arguments as AnyNode[]) || []).map((a: AnyNode) => evalExpr(a, state, steps, maxOps));
      return callMember(state, objV, String(propName), args, steps, maxOps, nodeLine(node));
    }

    throw new Error("Unsupported call");
  }

  throw new Error(`Unsupported expression: ${node.type}`);
}

export function execUpdateExpr(node: AnyNode, state: ExecutionState): Value {
  const name = node.argument?.name;
  if (!name) throw new Error("UpdateExpression supports only identifiers");
  const cur = getId(state, name);
  const curNum = asNumber(cur);
  const next = node.operator === "++" ? curNum + 1 : curNum - 1;
  setId(state, name, next);
  return node.prefix ? next : curNum;
}

export function setAssignable(node: AnyNode, state: ExecutionState, value: Value, steps?: Step[], maxOps?: { n: number }) {
  if (node.type === "Identifier") {
    setId(state, node.name, value);
    return;
  }

  if (node.type === "MemberExpression") {
    const objV = evalExpr(node.object, state, steps, maxOps);
    if (!isRef(objV)) throw new Error("Assignment to member on non-object");
    const o = deref(state, objV) as any;

    if (o.kind === "Array") {
      if (!node.computed) throw new Error("Array assignment requires computed index");
      if (!steps || !maxOps) throw new Error("Array assignment requires steps/maxOps");
      const idxV = evalExpr(node.property, state, steps, maxOps);
      const idx = asNumber(idxV);
      o.items[idx] = value;
      return;
    }

    if (o.kind === "Object") {
      if (!steps || !maxOps) throw new Error("Object assignment requires steps/maxOps");
      const key = node.computed ? String(evalExpr(node.property, state, steps, maxOps)) : String(node.property?.name);
      o.props[key] = value;
      return;
    }

    if (o.kind === "Instance") {
      if (!steps || !maxOps) throw new Error("Instance assignment requires steps/maxOps");
      const key = node.computed ? String(evalExpr(node.property, state, steps, maxOps)) : String(node.property?.name);
      o.props[key] = value;
      const writer = currentClassName(state);
      if (writer) o.propOrigin[key] = writer;
      return;
    }

    throw new Error("Unsupported member assignment");
  }

  throw new Error("Unsupported assignment target");
}
