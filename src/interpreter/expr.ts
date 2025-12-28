import type { AnyNode } from "../engine/parse";
import type { ExecutionState, Step, Value } from "../engine/types";
import { alloc, deref, globals, isRef, pushStep, valueToString } from "./state";
import { nodeLine } from "./ast";
import { execFunctionBody } from "./stmt";

function findFrame(state: ExecutionState, name: string) {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    const f = state.stack[i];
    if (name in f.locals) return f;
  }
  return null;
}

function getId(state: ExecutionState, name: string): Value {
  const frame = findFrame(state, name);
  if (!frame) throw new Error(`Undefined variable: ${name}`);
  return frame.locals[name];
}

function setId(state: ExecutionState, name: string, v: Value) {
  const frame = findFrame(state, name) ?? globals(state);
  frame.locals[name] = v;
}

function asNumber(v: Value): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") return Number(v);
  if (v === null || v === undefined) return 0;
  throw new Error("Not a number");
}

function looseEq(a: Value, b: Value): boolean {
  return (a as any) == (b as any);
}

function strictEq(a: Value, b: Value): boolean {
  return (a as any) === (b as any);
}

function getMember(state: ExecutionState, objV: Value, prop: string, computedKey?: Value): Value {
  if (!isRef(objV)) return undefined;

  const o = deref(state, objV);

  if (o.kind === "Array") {
    if (prop === "length") return o.items.length;
    if (computedKey !== undefined) {
      const idx = asNumber(computedKey);
      return o.items[idx] ?? undefined;
    }
    return undefined;
  }

  if (o.kind === "Stack") {
    if (prop === "length" || prop === "size") return o.items.length;
    if (prop === "peek") return o.items[o.items.length - 1] ?? undefined;
    return undefined;
  }

  if (o.kind === "Queue") {
    if (prop === "length" || prop === "size") return o.items.length;
    if (prop === "peek") return o.items[0] ?? undefined;
    return undefined;
  }

  if (o.kind === "BinaryTree") {
    if (prop === "root") return o.root ?? null;
    return undefined;
  }

  if (o.kind === "TreeNode") {
    if (prop === "value") return o.value;
    if (prop === "left") return o.left ?? null;
    if (prop === "right") return o.right ?? null;
    return undefined;
  }

  if (o.kind === "Object") {
    if (computedKey !== undefined) return o.props[String(computedKey)] ?? undefined;
    return o.props[prop] ?? undefined;
  }

  return undefined;
}

function callMember(state: ExecutionState, objV: Value, prop: string, args: Value[]): Value {
  if (!isRef(objV)) throw new Error("Method call on non-object");

  const o = deref(state, objV);

  if (o.kind === "Array") {
    if (prop === "push") {
      o.items.push(...args);
      return o.items.length;
    }
    if (prop === "pop") {
      return o.items.pop() ?? undefined;
    }
    if (prop === "shift") {
      return o.items.shift() ?? undefined;
    }
    if (prop === "unshift") {
      o.items.unshift(...args);
      return o.items.length;
    }
    throw new Error(`Unsupported array method: ${prop}`);
  }

  if (o.kind === "Stack") {
    if (prop === "push") {
      o.items.push(...args);
      return o.items.length;
    }
    if (prop === "pop") {
      return o.items.pop() ?? undefined;
    }
    if (prop === "peek") {
      return o.items[o.items.length - 1] ?? undefined;
    }
    if (prop === "size") return o.items.length;
    throw new Error(`Unsupported stack method: ${prop}`);
  }

  if (o.kind === "Queue") {
    if (prop === "enqueue") {
      o.items.push(...args);
      return o.items.length;
    }
    if (prop === "dequeue") {
      return o.items.shift() ?? undefined;
    }
    if (prop === "peek") {
      return o.items[0] ?? undefined;
    }
    if (prop === "size") return o.items.length;
    throw new Error(`Unsupported queue method: ${prop}`);
  }

  if (o.kind === "BinaryTree") {
    const insertNode = (nodeRef: Value, v: Value): Value => {
      if (!isRef(nodeRef)) return alloc(state, { kind: "TreeNode", value: v, left: null, right: null });
      const n = deref(state, nodeRef);
      if (n.kind !== "TreeNode") throw new Error("Invalid tree node");
      if (asNumber(v) < asNumber(n.value)) {
        n.left = n.left ? insertNode(n.left, v) : alloc(state, { kind: "TreeNode", value: v, left: null, right: null });
        return nodeRef;
      } else {
        n.right = n.right ? insertNode(n.right, v) : alloc(state, { kind: "TreeNode", value: v, left: null, right: null });
        return nodeRef;
      }
    };

    const containsNode = (nodeRef: Value | null, v: Value): boolean => {
      if (!nodeRef) return false;
      if (!isRef(nodeRef)) return false;
      const n = deref(state, nodeRef);
      if (n.kind !== "TreeNode") return false;
      if (strictEq(n.value, v)) return true;
      if (asNumber(v) < asNumber(n.value)) return containsNode(n.left ?? null, v);
      return containsNode(n.right ?? null, v);
    };

    const inOrder = (nodeRef: Value | null, out: Value[]) => {
      if (!nodeRef) return;
      if (!isRef(nodeRef)) return;
      const n = deref(state, nodeRef);
      if (n.kind !== "TreeNode") return;
      inOrder(n.left ?? null, out);
      out.push(n.value);
      inOrder(n.right ?? null, out);
    };

    if (prop === "insert") {
      const v = args[0];
      if (o.root) o.root = insertNode(o.root, v);
      else o.root = alloc(state, { kind: "TreeNode", value: v, left: null, right: null });
      return true;
    }

    if (prop === "contains") {
      return containsNode(o.root ?? null, args[0]);
    }

    if (prop === "inOrder") {
      const out: Value[] = [];
      inOrder(o.root ?? null, out);
      return alloc(state, { kind: "Array", items: out });
    }

    throw new Error(`Unsupported tree method: ${prop}`);
  }

  throw new Error(`Unsupported method call: ${prop}`);
}

function callUserFunction(
  state: ExecutionState,
  steps: Step[],
  maxOps: { n: number },
  name: string,
  args: Value[],
  atLine: number
): Value {
  const fnV = getId(state, name);
  if (!isRef(fnV)) throw new Error(`${name} is not a function ref`);
  const fnObj = deref(state, fnV);
  if (fnObj.kind !== "Function") throw new Error(`${name} is not a function`);

  const newFrame = { name, locals: {} as Record<string, Value> };
  for (let i = 0; i < fnObj.params.length; i++) {
    newFrame.locals[fnObj.params[i]] = args[i];
  }

  state.stack.push(newFrame);
  state.currentLine = atLine;
  pushStep(steps, state, `enter ${name}`);

  const ret = execFunctionBody(fnObj.body, state, steps, maxOps);

  state.stack.pop();
  state.currentLine = atLine;
  pushStep(steps, state, `exit ${name} -> ${valueToString(state, ret)}`);
  return ret;
}

export function evalExpr(node: AnyNode, state: ExecutionState, steps?: Step[], maxOps?: { n: number }): Value {
  if (!node) return undefined;

  if (node.type === "Literal") return node.value;

  if (node.type === "Identifier") return getId(state, node.name);

  if (node.type === "ArrayExpression") {
    const els = (node.elements as Array<AnyNode | null>) || [];
    const items: Value[] = els.map((e: AnyNode | null) => (e ? evalExpr(e, state, steps, maxOps) : undefined));
    return alloc(state, { kind: "Array", items });
  }

  if (node.type === "ObjectExpression") {
    const props: Record<string, Value> = {};
    const ps = (node.properties as AnyNode[]) || [];
    for (const p of ps) {
      const key = p.key?.name ?? p.key?.value;
      if (key === undefined) continue;
      props[String(key)] = evalExpr(p.value, state, steps, maxOps);
    }
    return alloc(state, { kind: "Object", props });
  }

  if (node.type === "UnaryExpression") {
    const v = evalExpr(node.argument, state, steps, maxOps);
    if (node.operator === "+") return +asNumber(v);
    if (node.operator === "-") return -asNumber(v);
    if (node.operator === "!") return !v;
    throw new Error(`Unsupported unary operator: ${node.operator}`);
  }

  if (node.type === "LogicalExpression") {
    const left = evalExpr(node.left, state, steps, maxOps);
    if (node.operator === "&&") return left ? evalExpr(node.right, state, steps, maxOps) : left;
    if (node.operator === "||") return left ? left : evalExpr(node.right, state, steps, maxOps);
    throw new Error(`Unsupported logical operator: ${node.operator}`);
  }

  if (node.type === "ConditionalExpression") {
    const t = evalExpr(node.test, state, steps, maxOps);
    return t ? evalExpr(node.consequent, state, steps, maxOps) : evalExpr(node.alternate, state, steps, maxOps);
  }

  if (node.type === "BinaryExpression") {
    const left = evalExpr(node.left, state, steps, maxOps);
    const right = evalExpr(node.right, state, steps, maxOps);

    switch (node.operator) {
      case "+": return (left as any) + (right as any);
      case "-": return asNumber(left) - asNumber(right);
      case "*": return asNumber(left) * asNumber(right);
      case "/": return asNumber(left) / asNumber(right);
      case ">": return asNumber(left) > asNumber(right);
      case "<": return asNumber(left) < asNumber(right);
      case ">=": return asNumber(left) >= asNumber(right);
      case "<=": return asNumber(left) <= asNumber(right);
      case "==": return looseEq(left, right);
      case "===": return strictEq(left, right);
      case "!=": return !looseEq(left, right);
      case "!==": return !strictEq(left, right);
      default:
        throw new Error(`Unsupported operator: ${node.operator}`);
    }
  }

  if (node.type === "MemberExpression") {
    const objV = evalExpr(node.object, state, steps, maxOps);
    const computed = !!node.computed;
    const prop = computed ? "" : node.property?.name;
    const key = computed ? evalExpr(node.property, state, steps, maxOps) : undefined;
    return getMember(state, objV, prop, key);
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

    if (callee?.type === "Identifier") {
      const name = callee.name;

      if (name === "Stack") return alloc(state, { kind: "Stack", items: [] });
      if (name === "Queue") return alloc(state, { kind: "Queue", items: [] });
      if (name === "BinaryTree") return alloc(state, { kind: "BinaryTree", root: null });

      const args: Value[] = ((node.arguments as AnyNode[]) || []).map((a: AnyNode) => evalExpr(a, state, steps, maxOps));

      if (!steps || !maxOps) throw new Error("Function calls require steps/maxOps context");
      const atLine = nodeLine(node);
      return callUserFunction(state, steps, maxOps, name, args, atLine);
    }

    if (callee?.type === "MemberExpression") {
      const objV = evalExpr(callee.object, state, steps, maxOps);
      const propName = callee.property?.name;
      if (!propName) throw new Error("Only identifier methods are supported");
      const args: Value[] = ((node.arguments as AnyNode[]) || []).map((a: AnyNode) => evalExpr(a, state, steps, maxOps));
      return callMember(state, objV, propName, args);
    }

    throw new Error("Unsupported call");
  }

  throw new Error(`Unsupported expression: ${node.type}`);
}

export function execUpdateExpr(node: AnyNode, state: ExecutionState): Value {
  if (node.type !== "UpdateExpression") throw new Error("Not update expr");
  if (node.argument?.type !== "Identifier") throw new Error("Only identifier update is supported");
  const name = node.argument.name;
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
    const o = deref(state, objV);

    if (o.kind === "Array") {
      if (!node.computed) throw new Error("Array assignment requires computed index");
      const idxV = evalExpr(node.property, state, steps, maxOps);
      const idx = asNumber(idxV);
      o.items[idx] = value;
      return;
    }

    if (o.kind === "Object") {
      const key = node.computed ? String(evalExpr(node.property, state, steps, maxOps)) : String(node.property?.name);
      o.props[key] = value;
      return;
    }

    throw new Error("Unsupported member assignment");
  }

  throw new Error("Unsupported assignment target");
}
