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

function treeLevels(state: ExecutionState, root: Value | null): Value[][] {
  if (!root || !isRef(root)) return [];
  const levels: Value[][] = [];
  let q: (Value | null)[] = [root];
  for (let depth = 0; depth < 6; depth++) {
    const next: (Value | null)[] = [];
    const row: Value[] = [];
    let hasAny = false;

    for (const nodeRef of q) {
      if (!nodeRef || !isRef(nodeRef)) {
        row.push(null);
        next.push(null, null);
        continue;
      }
      const n = state.heap[nodeRef.$ref];
      if (!n || n.kind !== "TreeNode") {
        row.push(null);
        next.push(null, null);
        continue;
      }
      row.push(n.value);
      next.push(n.left ?? null, n.right ?? null);
      if (n.left || n.right) hasAny = true;
    }

    levels.push(row);
    if (!hasAny) break;
    q = next;
  }
  return levels;
}

export default function StructuresPanel({ state }: { state: ExecutionState | null }) {
  if (!state) return null;

  const stacks = Object.entries(state.heap).filter(([, o]) => o.kind === "Stack");
  const queues = Object.entries(state.heap).filter(([, o]) => o.kind === "Queue");
  const trees = Object.entries(state.heap).filter(([, o]) => o.kind === "BinaryTree");

  return (
    <div className="panel">
      <div className="panelTitle">Data Structures</div>

      <div className="panelBlock">
        <div className="panelSubTitle">Stacks</div>
        {stacks.length === 0 ? <div className="mutedTiny">No stacks yet</div> : null}
        {stacks.map(([id, o]) => (
          <div key={id} className="dsCard">
            <div className="dsRow">
              <div className="dsName">{id}</div>
              <div className="dsMeta">size {(o as any).items.length}</div>
            </div>
            <div className="dsItems">{(o as any).items.slice().reverse().map((v: Value, i: number) => <div key={i} className="dsItem">{fmtValue(state, v)}</div>)}</div>
          </div>
        ))}
      </div>

      <div className="panelBlock">
        <div className="panelSubTitle">Queues</div>
        {queues.length === 0 ? <div className="mutedTiny">No queues yet</div> : null}
        {queues.map(([id, o]) => (
          <div key={id} className="dsCard">
            <div className="dsRow">
              <div className="dsName">{id}</div>
              <div className="dsMeta">size {(o as any).items.length}</div>
            </div>
            <div className="dsItems">{(o as any).items.map((v: Value, i: number) => <div key={i} className="dsItem">{fmtValue(state, v)}</div>)}</div>
          </div>
        ))}
      </div>

      <div className="panelBlock">
        <div className="panelSubTitle">Binary Trees</div>
        {trees.length === 0 ? <div className="mutedTiny">No trees yet</div> : null}
        {trees.map(([id, o]) => {
          const levels = treeLevels(state, (o as any).root ?? null);
          return (
            <div key={id} className="dsCard">
              <div className="dsRow">
                <div className="dsName">{id}</div>
                <div className="dsMeta">{(o as any).root ? "root set" : "empty"}</div>
              </div>

              {levels.length === 0 ? (
                <div className="mutedTiny">Empty</div>
              ) : (
                <div className="treeLevels">
                  {levels.map((lvl, li) => (
                    <div key={li} className="treeLevel">
                      {lvl.map((v, i) => (
                        <div key={i} className="treeNode">
                          {v === null ? "·" : fmtValue(state, v)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
