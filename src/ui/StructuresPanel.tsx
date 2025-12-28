// ui/StructuresPanel.tsx
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

export default function StructuresPanel({ state }: { state: ExecutionState | null }) {
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

  return (
    <div className="panel dsPanel">
      <div className="panelHead">
        <div className="panelTitle">Data Structures</div>
        <div className="panelSub">visual trace</div>
      </div>

      <div className="panelBody">
        <div className="dsGrid">
          {classes.map(([id]) => (
            <ClassViz key={id} state={state} id={id} />
          ))}

          {instances.map(([id]) => (
            <InstanceViz key={id} state={state} id={id} />
          ))}

          {traces.map(([id]) => (
            <CallTraceViz key={id} state={state} id={id} />
          ))}

          {stacks.map(([id, o]) => (
            <div key={id} className="dsCard">
              <div className="dsRow">
                <div className="dsName">Stack</div>
                <div className="dsMeta">{o.items.length} items</div>
              </div>
              <div className="dsPills">
                {(o.items as Value[]).slice(-12).reverse().map((v: Value, i: number) => (
                  <span key={i} className="pill" title={fmtValue(state, v)}>
                    {cut(fmtValue(state, v), 18)}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {queues.map(([id, o]) => (
            <div key={id} className="dsCard">
              <div className="dsRow">
                <div className="dsName">Queue</div>
                <div className="dsMeta">{o.items.length} items</div>
              </div>
              <div className="dsPills">
                {(o.items as Value[]).slice(0, 12).map((v: Value, i: number) => (
                  <span key={i} className="pill" title={fmtValue(state, v)}>
                    {cut(fmtValue(state, v), 18)}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {arrays.map(([id, o]) => (
            <div key={id} className="dsCard">
              <div className="dsRow">
                <div className="dsName">Array</div>
                <div className="dsMeta">{o.items.length} items</div>
              </div>
              <div className="dsPills">
                {(o.items as Value[]).slice(0, 12).map((v: Value, i: number) => (
                  <span key={i} className="pill" title={fmtValue(state, v)}>
                    {cut(fmtValue(state, v), 18)}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {trees.map(([id, o]) => (
            <div key={id} className="dsCard objectCard">
              <div className="dsRow">
                <div className="dsName">BinaryTree</div>
                <div className="dsMeta">{o.root ? "root set" : "empty"}</div>
              </div>
              <div style={{ opacity: 0.7, marginTop: 8 }}>root: {o.root ? fmtValue(state, o.root) : "null"}</div>
            </div>
          ))}

          {objects.map(([id, o]) => (
            <div key={id} className="dsCard objectCard">
              <div className="dsRow">
                <div className="dsName">Object</div>
                <div className="dsMeta">{Object.keys(o.props || {}).length} props</div>
              </div>
              <ObjectViz state={state} props={(o.props || {}) as Record<string, Value>} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
