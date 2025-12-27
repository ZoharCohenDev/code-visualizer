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
    return o.kind;
  }
  return String(v);
}

type TreeVizNode = {
  id: string;
  value: Value;
  depth: number;
  xIndex: number;
  left: Value | null;
  right: Value | null;
};

function buildTreeLayout(state: ExecutionState, root: Value | null) {
  if (!root || !isRef(root)) return { nodes: [] as TreeVizNode[], edges: [] as { from: string; to: string }[] };

  const nodesById = new Map<string, TreeVizNode>();
  const edges: { from: string; to: string }[] = [];
  let xCounter = 0;

  const walk = (ref: Value | null, depth: number) => {
    if (!ref || !isRef(ref)) return;
    const obj = state.heap[ref.$ref];
    if (!obj || obj.kind !== "TreeNode") return;

    const left = (obj.left ?? null) as Value | null;
    const right = (obj.right ?? null) as Value | null;

    walk(left, depth + 1);

    const id = ref.$ref;
    const node: TreeVizNode = {
      id,
      value: obj.value,
      depth,
      xIndex: xCounter++,
      left,
      right,
    };
    nodesById.set(id, node);

    if (left && isRef(left)) edges.push({ from: id, to: left.$ref });
    if (right && isRef(right)) edges.push({ from: id, to: right.$ref });

    walk(right, depth + 1);
  };

  walk(root, 0);

  return { nodes: Array.from(nodesById.values()), edges };
}

function BinaryTreeViz({ state, root }: { state: ExecutionState; root: Value | null }) {
  const { nodes, edges } = buildTreeLayout(state, root);

  if (!nodes.length) return <div className="mutedTiny">Empty</div>;

  const NODE_R = 24;
  const X_GAP = 76;
  const Y_GAP = 92;
  const PAD_X = 34;
  const PAD_Y = 34;

  const maxX = Math.max(...nodes.map((n) => n.xIndex));
  const maxDepth = Math.max(...nodes.map((n) => n.depth));

  const width = PAD_X * 2 + (maxX + 1) * X_GAP;
  const height = PAD_Y * 2 + (maxDepth + 1) * Y_GAP;

  const pos = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    pos.set(n.id, {
      x: PAD_X + n.xIndex * X_GAP,
      y: PAD_Y + n.depth * Y_GAP,
    });
  }

  return (
    <div className="treeVizWrap">
      <svg className="treeSvg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="nodeStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(124,92,255,0.95)" />
            <stop offset="100%" stopColor="rgba(45,226,230,0.9)" />
          </linearGradient>

          <linearGradient id="nodeFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(124,92,255,0.20)" />
            <stop offset="100%" stopColor="rgba(45,226,230,0.12)" />
          </linearGradient>

          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.from}-${e.to}-${i}`}
              x1={a.x}
              y1={a.y + NODE_R}
              x2={b.x}
              y2={b.y - NODE_R}
              className="treeEdge"
            />
          );
        })}

        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r={NODE_R} className="treeNodeCircle" />
              <text x={p.x} y={p.y + 1} className="treeNodeText" textAnchor="middle" dominantBaseline="middle">
                {fmtValue(state, n.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function StructuresPanel({ state }: { state: ExecutionState | null }) {
  if (!state) return null;

  const stacks = Object.entries(state.heap).filter(([, o]) => o.kind === "Stack");
  const queues = Object.entries(state.heap).filter(([, o]) => o.kind === "Queue");
  const trees = Object.entries(state.heap).filter(([, o]) => o.kind === "BinaryTree");

    return (
    <div className="panel">
      <div className="panelHead">
        <div className="panelTitle">Data Structures</div>
        <div className="panelSub">visual trace</div>
      </div>

      <div className="panelBody">
        <div className="dsGrid">
          <div className="dsCol">
            <div className="dsColHead">Stacks</div>
            {stacks.length === 0 ? <div className="mutedTiny">No stacks yet</div> : null}
            {stacks.map(([id, o]) => {
              const items = (o as any).items as Value[];
              const top = items.length ? items[items.length - 1] : null;

              return (
                <div key={id} className="dsCard stackCard">
                  <div className="dsRow">
                    <div className="dsName">{id}</div>
                    <div className="dsMeta">size {items.length}{top !== null ? ` | top ${fmtValue(state, top)}` : ""}</div>
                  </div>

                  <div className="stackViz">
                    <div className="stackTube" />
                    <div className="stackBase" />
                    <div className="stackItems">
                      {items.length ? (
                        items.slice().reverse().map((v, i) => (
                          <div key={i} className={`stackBullet ${i === 0 ? "top" : ""}`}>
                            {fmtValue(state, v)}
                          </div>
                        ))
                      ) : (
                        <div className="mutedTiny">Empty</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dsCol">
            <div className="dsColHead">Queues</div>
            {queues.length === 0 ? <div className="mutedTiny">No queues yet</div> : null}
            {queues.map(([id, o]) => {
              const items = (o as any).items as Value[];
              const front = items.length ? items[0] : null;
              const back = items.length ? items[items.length - 1] : null;

              return (
                <div key={id} className="dsCard queueCard">
                  <div className="dsRow">
                    <div className="dsName">{id}</div>
                    <div className="dsMeta">
                      size {items.length}
                      {front !== null ? ` | front ${fmtValue(state, front)}` : ""}
                      {back !== null ? ` | back ${fmtValue(state, back)}` : ""}
                    </div>
                  </div>

                  <div className="queueViz">
                    <div className="queueTag front">FRONT</div>
                    <div className="queueBelt">
                      {items.length ? (
                        items.map((v, i) => (
                          <div key={i} className="queueBox">
                            {fmtValue(state, v)}
                          </div>
                        ))
                      ) : (
                        <div className="mutedTiny">Empty</div>
                      )}
                    </div>
                    <div className="queueTag back">BACK</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dsCol">
            <div className="dsColHead">Binary Trees</div>
            {trees.length === 0 ? <div className="mutedTiny">No trees yet</div> : null}
            {trees.map(([id, o]) => {
              const root = (o as any).root ?? null;
              return (
                <div key={id} className="dsCard treeCard">
                  <div className="dsRow">
                    <div className="dsName">{id}</div>
                    <div className="dsMeta">{root ? "root set" : "empty"}</div>
                  </div>
                  <BinaryTreeViz state={state} root={root} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
