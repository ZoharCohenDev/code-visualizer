import type { ExecutionState, Value } from "../engine/types";

function isRef(v: Value): v is { $ref: string } {
  return !!v && typeof v === "object" && "$ref" in v;
}

function cut(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function fmtValue(state: ExecutionState, v: Value): string {
  if (isRef(v)) {
    const o = state.heap[v.$ref] as any;
    if (!o) return "[ref]";
    if (o.kind === "Array") return `[${(o.items as Value[]).map((x) => fmtValue(state, x)).join(", ")}]`;
    if (o.kind === "Stack") return `Stack(${(o.items as Value[]).map((x) => fmtValue(state, x)).join(", ")})`;
    if (o.kind === "Queue") return `Queue(${(o.items as Value[]).map((x) => fmtValue(state, x)).join(", ")})`;
    if (o.kind === "BinaryTree") return `BinaryTree(${o.root ? fmtValue(state, o.root) : "empty"})`;
    if (o.kind === "TreeNode") return `Node(${fmtValue(state, o.value)})`;
    if (o.kind === "Function") return `function ${o.name}()`;
    if (o.kind === "Class") return `class ${o.name}`;
    if (o.kind === "Instance") {
      const cls = isRef(o.classRef) ? (state.heap[o.classRef.$ref] as any) : null;
      const name = cls && cls.kind === "Class" ? cls.name : "Instance";
      return `${name} instance`;
    }
    if (o.kind === "CallTrace") return "CallTrace";
    if (o.kind === "CallNode") return `Call(${o.fnName})`;
    if (o.kind === "Object") return `Object(${Object.keys(o.props || {}).length})`;
    return o.kind;
  }
  return String(v);
}

function ObjectViz({ state, props }: { state: ExecutionState; props: Record<string, Value> }) {
  const entries = Object.entries(props) as [string, Value][];
  const shown = entries.slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
      {shown.length ? (
        shown.map(([k, v]) => (
          <div
            key={k}
            title={`${k}: ${fmtValue(state, v)}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              padding: "6px 8px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span style={{ opacity: 0.9, fontWeight: 700 }}>{k}</span>
            <span style={{ opacity: 0.85 }}>{cut(fmtValue(state, v), 32)}</span>
          </div>
        ))
      ) : (
        <div style={{ opacity: 0.6, marginTop: 8 }}>Empty</div>
      )}
      {entries.length > shown.length ? <div style={{ opacity: 0.6 }}>+{entries.length - shown.length}</div> : null}
    </div>
  );
}

function ClassViz({ state, id }: { state: ExecutionState; id: string }) {
  const o: any = state.heap[id];
  if (!o || o.kind !== "Class") return null;

  const superName =
    o.superClass && isRef(o.superClass) && (state.heap[(o.superClass as any).$ref] as any)?.kind === "Class"
      ? (state.heap[(o.superClass as any).$ref] as any).name
      : null;

  const methods = Object.keys(o.methods || {}).filter((m) => m !== "constructor");

  return (
    <div className="dsCard objectCard">
      <div className="dsRow">
        <div className="dsName">{o.name}</div>
        <div className="dsMeta">{superName ? `extends ${superName}` : "base class"}</div>
      </div>

      <div style={{ marginTop: 10 }}>
        {superName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(255,178,0,0.16)",
                border: "1px solid rgba(255,178,0,0.35)",
                fontWeight: 800,
              }}
            >
              {superName}
            </span>
            <span style={{ opacity: 0.8, fontWeight: 900 }}>→</span>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(124,92,255,0.18)",
                border: "1px solid rgba(124,92,255,0.38)",
                fontWeight: 900,
              }}
            >
              {o.name}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(124,92,255,0.18)",
                border: "1px solid rgba(124,92,255,0.38)",
                fontWeight: 900,
              }}
            >
              {o.name}
            </span>
          </div>
        )}

        <div style={{ opacity: 0.7, marginTop: 10 }}>
          Methods: {methods.length ? methods.join(", ") : "none"}
        </div>
      </div>
    </div>
  );
}

function InstanceViz({ state, id }: { state: ExecutionState; id: string }) {
  const o: any = state.heap[id];
  if (!o || o.kind !== "Instance") return null;

  const cls =
    isRef(o.classRef) && (state.heap[(o.classRef as any).$ref] as any)?.kind === "Class" ? (state.heap[(o.classRef as any).$ref] as any) : null;

  const name = cls?.name ?? "Instance";

  const props = Object.entries(o.props || {}) as [string, Value][];
  const shown = props.slice(0, 12);

  return (
    <div className="dsCard objectCard">
      <div className="dsRow">
        <div className="dsName">{name} instance</div>
        <div className="dsMeta">{props.length} props</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {shown.length ? (
          shown.map(([k, v]) => {
            const origin = (o.propOrigin?.[k] || "") as string;
            const inherited = origin && origin !== name;

            return (
              <div
                key={k}
                title={`${k}: ${fmtValue(state, v)}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: inherited ? "1px solid rgba(255,178,0,0.40)" : "1px solid rgba(124,92,255,0.35)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 900 }}>{k}</span>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: inherited ? "rgba(255,178,0,0.16)" : "rgba(124,92,255,0.16)",
                      border: inherited ? "1px solid rgba(255,178,0,0.35)" : "1px solid rgba(124,92,255,0.35)",
                      opacity: 0.95,
                      fontWeight: 800,
                    }}
                  >
                    {origin ? (inherited ? `inherited: ${origin}` : `own: ${origin}`) : "prop"}
                  </span>
                </div>
                <span style={{ opacity: 0.85 }}>{cut(fmtValue(state, v), 30)}</span>
              </div>
            );
          })
        ) : (
          <div style={{ opacity: 0.6 }}>Empty</div>
        )}

        {props.length > shown.length ? <div style={{ opacity: 0.6 }}>+{props.length - shown.length}</div> : null}
      </div>
    </div>
  );
}

function TraceNode({ state, nodeRef, depth }: { state: ExecutionState; nodeRef: Value; depth: number }) {
  if (!isRef(nodeRef)) return null;
  const n: any = state.heap[nodeRef.$ref];
  if (!n || n.kind !== "CallNode") return null;

  const title = `${n.fnName}(${(n.args || []).map((a: Value) => cut(fmtValue(state, a), 14)).join(", ")})`;
  const ret = n.status === "done" ? `→ ${cut(fmtValue(state, n.returnValue), 22)}` : "…";

  return (
    <div style={{ marginLeft: depth * 14, marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          padding: "8px 10px",
          borderRadius: 12,
          background: n.status === "done" ? "rgba(45,226,230,0.10)" : "rgba(255,255,255,0.06)",
          border: n.status === "done" ? "1px solid rgba(45,226,230,0.35)" : "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <span style={{ fontWeight: 900 }}>{title}</span>
        <span style={{ opacity: 0.85, fontWeight: 800 }}>{ret}</span>
      </div>

      {(n.children || []).map((c: Value, i: number) => (
        <TraceNode key={(isRef(c) ? c.$ref : String(i))} state={state} nodeRef={c} depth={depth + 1} />
      ))}
    </div>
  );
}

function CallTraceViz({ state, id }: { state: ExecutionState; id: string }) {
  const t: any = state.heap[id];
  if (!t || t.kind !== "CallTrace") return null;

  return (
    <div className="dsCard objectCard">
      <div className="dsRow">
        <div className="dsName">Recursion Trace</div>
        <div className="dsMeta">call tree</div>
      </div>

      {t.root ? <TraceNode state={state} nodeRef={t.root} depth={0} /> : <div style={{ opacity: 0.6, marginTop: 8 }}>No calls yet</div>}
    </div>
  );
}

function StackViz({ state, items }: { state: ExecutionState; items: Value[] }) {
  const shown = items.slice(-12);
  const topIdx = shown.length - 1;

  return (
    <div className="dsViz">
      <div className="stackViz">
        <div className="stackTube" />
        <div className="stackBase" />
        <div className="stackItems">
          {shown.map((v, i) => (
            <div key={i} className={`stackBullet ${i === topIdx ? "top" : ""}`} title={fmtValue(state, v)}>
              {cut(fmtValue(state, v), 20)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QueueViz({ state, items }: { state: ExecutionState; items: Value[] }) {
  const shown = items.slice(0, 10);
  const more = items.length - shown.length;

  return (
    <div className="dsViz">
      <div className="queueViz">
        <div className="queueBelt">
          <div className="queueTag front">FRONT</div>
          {shown.map((v, i) => (
            <div key={i} className="queueBox" title={fmtValue(state, v)}>
              {cut(fmtValue(state, v), 20)}
            </div>
          ))}
          {more > 0 ? <div className="queueMore">+{more}</div> : null}
          <div className="queueSpacer" />
          <div className="queueTag back">BACK</div>
        </div>
      </div>
    </div>
  );
}

function ArrayViz({ state, items }: { state: ExecutionState; items: Value[] }) {
  const shown = items.slice(0, 10);
  const more = items.length - shown.length;

  return (
    <div className="dsViz arrayViz">
      <div className="arrayBelt">
        {shown.map((v, i) => (
          <div key={i} className="arrayCell" title={fmtValue(state, v)}>
            <div className="arrayIdx">[{i}]</div>
            <div className="arrayVal">{cut(fmtValue(state, v), 20)}</div>
          </div>
        ))}
        {more > 0 ? <div className="arrayMore">+{more}</div> : null}
      </div>
    </div>
  );
}

function buildTreeLayout(state: ExecutionState, root: Value | null) {
  if (!root || !isRef(root)) return { nodes: [], edges: [] };

  const nodes: { id: string; x: number; y: number; label: string }[] = [];
  const edges: { from: string; to: string }[] = [];

  let order = 0;

  function inorder(nodeRef: Value | null, depth: number) {
    if (!nodeRef || !isRef(nodeRef)) return;
    const n: any = state.heap[nodeRef.$ref];
    if (!n || n.kind !== "TreeNode") return;

    inorder(n.left, depth + 1);

    const id = nodeRef.$ref;
    const x = order++;
    const y = depth;
    nodes.push({ id, x, y, label: cut(fmtValue(state, n.value), 10) });

    if (n.left && isRef(n.left)) edges.push({ from: id, to: (n.left as any).$ref });
    if (n.right && isRef(n.right)) edges.push({ from: id, to: (n.right as any).$ref });

    inorder(n.right, depth + 1);
  }

  inorder(root, 0);

  const maxX = nodes.reduce((m, n) => Math.max(m, n.x), 0);
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y), 0);

  const width = Math.max(520, (maxX + 1) * 90);
  const height = Math.max(240, (maxY + 1) * 110);

  const toPx = (n: { x: number; y: number }) => ({
    px: 60 + n.x * 90,
    py: 50 + n.y * 110,
  });

  const pos = new Map<string, { px: number; py: number }>();
  nodes.forEach((n) => pos.set(n.id, toPx(n)));

  return { nodes, edges, width, height, pos };
}

function TreeViz({ state, root }: { state: ExecutionState; root: Value | null }) {
  const layout = buildTreeLayout(state, root);

  if (!layout.nodes.length || !layout.pos) {
    return (
      <div className="dsViz">
        <div className="dsEmptyMini">Empty tree</div>
      </div>
    );
  }


  return (
    <div className="dsViz">
      <div className="treeVizWrap">
        <svg className="treeSvg" viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="nodeFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(124,92,255,0.35)" />
              <stop offset="1" stopColor="rgba(45,226,230,0.22)" />
            </linearGradient>
            <linearGradient id="nodeStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(200,230,255,0.55)" />
              <stop offset="1" stopColor="rgba(185,215,255,0.45)" />
            </linearGradient>
            <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {layout.edges.map((e, i) => {
            const a = layout.pos.get(e.from);
            const b = layout.pos.get(e.to);
            if (!a || !b) return null;
            return <line key={i} className="treeEdge" x1={a.px} y1={a.py} x2={b.px} y2={b.py} />;
          })}

          {layout.nodes.map((n) => {
            const p = layout.pos.get(n.id)!;
            return (
              <g key={n.id}>
                <circle className="treeNodeCircle" cx={p.px} cy={p.py} r={22} />
                <text className="treeNodeText" x={p.px} y={p.py + 5} textAnchor="middle">
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export type DSFocus = {
  kind: "Class" | "Instance" | "CallTrace" | "Stack" | "Queue" | "Array" | "BinaryTree" | "Object";
  id: string;
};

type Props = {
  state: ExecutionState | null;
  onOpen?: (focus: DSFocus) => void;
  focus?: DSFocus | null;
  inModal?: boolean;
};

export default function StructuresPanel({ state, onOpen, focus, inModal }: Props) {
  if (!state) return null;

  const heapEntries = Object.entries(state.heap) as [string, any][];

  const stacks = heapEntries.filter(([, o]) => o.kind === "Stack");
  const queues = heapEntries.filter(([, o]) => o.kind === "Queue");
  const trees = heapEntries.filter(([, o]) => o.kind === "BinaryTree");
  const arrays = heapEntries.filter(([, o]) => o.kind === "Array");
  const objects = heapEntries.filter(([, o]) => o.kind === "Object");
  const classes = heapEntries.filter(([, o]) => o.kind === "Class");
  const instances = heapEntries.filter(([, o]) => o.kind === "Instance");
  const traces = heapEntries.filter(([, o]) => o.kind === "CallTrace");

  const want = (kind: DSFocus["kind"], id: string) => {
    if (!focus) return true;
    return focus.kind === kind && focus.id === id;
  };

  const clickable = (kind: DSFocus["kind"], id: string) => ({
    role: onOpen ? "button" : undefined,
    tabIndex: onOpen ? 0 : undefined,
    onClick: onOpen ? () => onOpen({ kind, id }) : undefined,
    onKeyDown: onOpen
      ? (e: any) => {
          if (e.key === "Enter" || e.key === " ") onOpen({ kind, id });
        }
      : undefined,
    className: onOpen ? "dsCard dsCardClickable" : "dsCard",
  });

  const clickableObjectCard = (kind: DSFocus["kind"], id: string) => ({
    role: onOpen ? "button" : undefined,
    tabIndex: onOpen ? 0 : undefined,
    onClick: onOpen ? () => onOpen({ kind, id }) : undefined,
    onKeyDown: onOpen
      ? (e: any) => {
          if (e.key === "Enter" || e.key === " ") onOpen({ kind, id });
        }
      : undefined,
    className: onOpen ? "dsCard objectCard dsCardClickable" : "dsCard objectCard",
  });

  return (
    <div className={inModal ? "panel dsPanel dsPanelInModal" : "panel dsPanel"}>
      <div className="panelHead">
        <div className="panelTitle">Data Structures</div>
        <div className="panelSub">visual trace</div>
      </div>

      <div className="panelBody">
        <div className="dsGrid">
          {classes.map(([id]) => {
            if (!want("Class", id)) return null;
            return (
              <div key={id} {...clickableObjectCard("Class", id)}>
                <ClassViz state={state} id={id} />
              </div>
            );
          })}

          {instances.map(([id]) => {
            if (!want("Instance", id)) return null;
            return (
              <div key={id} {...clickableObjectCard("Instance", id)}>
                <InstanceViz state={state} id={id} />
              </div>
            );
          })}

          {traces.map(([id]) => {
            if (!want("CallTrace", id)) return null;
            return (
              <div key={id} {...clickableObjectCard("CallTrace", id)}>
                <CallTraceViz state={state} id={id} />
              </div>
            );
          })}

          {stacks.map(([id, o]) => {
            if (!want("Stack", id)) return null;
            return (
              <div key={id} {...clickable("Stack", id)}>
                <div className="dsRow">
                  <div className="dsName">Stack</div>
                  <div className="dsMeta">{o.items.length} items</div>
                </div>
                <StackViz state={state} items={o.items as Value[]} />
              </div>
            );
          })}

          {queues.map(([id, o]) => {
            if (!want("Queue", id)) return null;
            return (
              <div key={id} {...clickable("Queue", id)}>
                <div className="dsRow">
                  <div className="dsName">Queue</div>
                  <div className="dsMeta">{o.items.length} items</div>
                </div>
                <QueueViz state={state} items={o.items as Value[]} />
              </div>
            );
          })}

          {arrays.map(([id, o]) => {
            if (!want("Array", id)) return null;
            return (
              <div key={id} {...clickable("Array", id)}>
                <div className="dsRow">
                  <div className="dsName">Array</div>
                  <div className="dsMeta">{o.items.length} items</div>
                </div>
                <ArrayViz state={state} items={o.items as Value[]} />
              </div>
            );
          })}

          {trees.map(([id, o]) => {
            if (!want("BinaryTree", id)) return null;
            return (
              <div key={id} {...clickable("BinaryTree", id)}>
                <div className="dsRow">
                  <div className="dsName">BinaryTree</div>
                  <div className="dsMeta">{o.root ? "root set" : "empty"}</div>
                </div>
                <TreeViz state={state} root={o.root as Value | null} />
              </div>
            );
          })}

          {objects.map(([id, o]) => {
            if (!want("Object", id)) return null;
            return (
              <div key={id} {...clickableObjectCard("Object", id)}>
                <div className="dsRow">
                  <div className="dsName">Object</div>
                  <div className="dsMeta">{Object.keys(o.props || {}).length} props</div>
                </div>
                <ObjectViz state={state} props={(o.props || {}) as Record<string, Value>} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
