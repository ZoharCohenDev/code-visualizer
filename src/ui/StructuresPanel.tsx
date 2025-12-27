import Panel from "./Panel";
import type { ExecutionState, Value } from "../engine/types";

function isRef(v: Value): v is { $ref: string } {
  return !!v && typeof v === "object" && "$ref" in v;
}

function fmtValue(state: ExecutionState, v: Value): string {
  if (isRef(v)) {
    const o = state.heap[v.$ref];
    if (!o) return "[ref]";
    if (o.kind === "Array") return `[${o.items.map((x) => fmtValue(state, x)).join(", ")}]`;
    if (o.kind === "Stack") return `Stack(${o.items.map((x) => fmtValue(state, x)).join(", ")})`;
    if (o.kind === "Queue") return `Queue(${o.items.map((x) => fmtValue(state, x)).join(", ")})`;
    if (o.kind === "BinaryTree") return `BinaryTree(${o.root ? fmtValue(state, o.root) : "empty"})`;
    if (o.kind === "TreeNode") return `Node(${fmtValue(state, o.value)})`;
    if (o.kind === "Function") return `function ${o.name}()`;
    return `Object(${Object.keys((o as any).props ?? {}).length})`;
  }
  return String(v);
}

function StackLike({ state, id, items }: { state: ExecutionState; id: string; items: Value[] }) {
  const top = items.length ? items[items.length - 1] : undefined;

  return (
    <div className="dsCard">
      <div className="dsRow">
        <div className="dsName">{id}</div>
        <div className="dsMeta">
          size {items.length}
          {items.length ? ` | top ${fmtValue(state, top as Value)}` : ""}
        </div>
      </div>

      <div className="list">
        {items.length ? (
          items.map((v, i) => (
            <div className="row" key={`${id}-stack-${i}`}>
              <div className="rowMain">
                <div className="rowTitle">{fmtValue(state, v)}</div>
                <div className="rowSub">{i === items.length - 1 ? "top item" : "item"}</div>
              </div>
              <div className={`chip ${i === items.length - 1 ? "active" : ""}`}>
                {i === items.length - 1 ? "top" : "in stack"}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">Empty</div>
        )}
      </div>
    </div>
  );
}

function QueueLike({ state, id, items }: { state: ExecutionState; id: string; items: Value[] }) {
  const head = items.length ? items[0] : undefined;
  const tail = items.length ? items[items.length - 1] : undefined;

  return (
    <div className="dsCard queue">
      <div className="dsRow">
        <div className="dsName">{id}</div>
        <div className="dsMeta">
          size {items.length}
          {items.length ? ` | head ${fmtValue(state, head as Value)} | tail ${fmtValue(state, tail as Value)}` : ""}
        </div>
      </div>

      <div className="dsItems">
        {items.length ? (
          items.map((v, i) => (
            <div className="dsItem" key={`${id}-queue-${i}`}>
              {fmtValue(state, v)}
            </div>
          ))
        ) : (
          <div className="empty">Empty</div>
        )}
      </div>
    </div>
  );
}

type TreeNodeLayout = { ref: string; x: number; y: number; label: string; active: boolean };
type TreeEdgeLayout = { x1: number; y1: number; x2: number; y2: number };

function buildTreeLayout(state: ExecutionState, root: Value | null, maxDepth = 5) {
  const W = 900;
  const levelH = 78;

  if (!root || !isRef(root)) {
    return { W, H: 260, nodes: [] as TreeNodeLayout[], edges: [] as TreeEdgeLayout[] };
  }

  const slots = new Map<string, Value>();
  const q: { v: Value; depth: number; slot: number }[] = [{ v: root, depth: 0, slot: 0 }];
  let maxUsedDepth = 0;

  while (q.length) {
    const cur = q.shift()!;
    if (cur.depth > maxDepth) continue;
    if (!isRef(cur.v)) continue;

    const key = `${cur.depth}:${cur.slot}`;
    slots.set(key, cur.v);
    maxUsedDepth = Math.max(maxUsedDepth, cur.depth);

    const obj = state.heap[cur.v.$ref];
    if (!obj || obj.kind !== "TreeNode") continue;

    const left = obj.left ?? null;
    const right = obj.right ?? null;

    if (left && isRef(left)) q.push({ v: left, depth: cur.depth + 1, slot: cur.slot * 2 });
    if (right && isRef(right)) q.push({ v: right, depth: cur.depth + 1, slot: cur.slot * 2 + 1 });
  }

  const nodes: TreeNodeLayout[] = [];
  const pos = new Map<string, { x: number; y: number }>();
  const edges: TreeEdgeLayout[] = [];

  const H = Math.max(260, (maxUsedDepth + 2) * levelH);

  for (let depth = 0; depth <= maxUsedDepth; depth++) {
    const slotsCount = 2 ** depth;
    for (let slot = 0; slot < slotsCount; slot++) {
      const key = `${depth}:${slot}`;
      const v = slots.get(key);
      if (!v || !isRef(v)) continue;

      const x = ((slot + 0.5) / slotsCount) * W;
      const y = 44 + depth * levelH;

      const obj = state.heap[v.$ref];
      let label = v.$ref;
      if (obj && obj.kind === "TreeNode") label = fmtValue(state, obj.value);

      nodes.push({ ref: v.$ref, x, y, label, active: depth === 0 });
      pos.set(v.$ref, { x, y });
    }
  }

  for (const n of nodes) {
    const obj = state.heap[n.ref];
    if (!obj || obj.kind !== "TreeNode") continue;

    const from = pos.get(n.ref);
    if (!from) continue;

    const left = obj.left ?? null;
    const right = obj.right ?? null;

    if (left && isRef(left)) {
      const to = pos.get(left.$ref);
      if (to) edges.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    }
    if (right && isRef(right)) {
      const to = pos.get(right.$ref);
      if (to) edges.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    }
  }

  return { W, H, nodes, edges };
}

function TreeLike({ state, id, root }: { state: ExecutionState; id: string; root: Value | null }) {
  const layout = buildTreeLayout(state, root, 5);

  return (
    <div className="dsCard tree">
      <div className="dsRow">
        <div className="dsName">{id}</div>
        <div className="dsMeta">{root ? "root set" : "empty"}</div>
      </div>

      <div className="treeCanvas">
        {layout.nodes.length === 0 ? (
          <div className="empty">Empty</div>
        ) : (
          <svg className="treeSvg" viewBox={`0 0 ${layout.W} ${layout.H}`} preserveAspectRatio="none">
            {layout.edges.map((e, i) => (
              <line key={`e-${i}`} className="treeEdge" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
            ))}

            {layout.nodes.map((n) => (
              <g key={n.ref}>
                <circle className={`treeNodeCircle ${n.active ? "active" : ""}`} cx={n.x} cy={n.y} r={24} />
                <text className="treeNodeText" x={n.x} y={n.y}>
                  {n.label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

export default function StructuresPanel({ state }: { state: ExecutionState | null }) {
  if (!state) return null;

  const stacks = Object.entries(state.heap).filter(([, o]) => o.kind === "Stack") as [string, any][];
  const queues = Object.entries(state.heap).filter(([, o]) => o.kind === "Queue") as [string, any][];
  const trees = Object.entries(state.heap).filter(([, o]) => o.kind === "BinaryTree") as [string, any][];

  return (
    <Panel title="Data Structures" subtitle="visual trace">
      <div className="panelBlock">
        <div className="panelSubTitle">Stack</div>
        {stacks.length ? (
          stacks.map(([id, o]) => <StackLike key={id} state={state} id={id} items={o.items ?? []} />)
        ) : (
          <div className="mutedTiny">No stacks yet</div>
        )}
      </div>

      <div className="panelBlock">
        <div className="panelSubTitle">Queue</div>
        {queues.length ? (
          queues.map(([id, o]) => <QueueLike key={id} state={state} id={id} items={o.items ?? []} />)
        ) : (
          <div className="mutedTiny">No queues yet</div>
        )}
      </div>

      <div className="panelBlock">
        <div className="panelSubTitle">Binary Tree</div>
        {trees.length ? (
          trees.map(([id, o]) => <TreeLike key={id} state={state} id={id} root={(o as any).root ?? null} />)
        ) : (
          <div className="mutedTiny">No trees yet</div>
        )}
      </div>
    </Panel>
  );
}
