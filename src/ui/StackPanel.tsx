import Panel from "./Panel";
import type { StackFrame } from "../engine/types";

export default function StackPanel({
  stack,
  activeLine,
}: {
  stack: StackFrame[];
  activeLine?: number;
}) {
  const view = [...stack].reverse();

  return (
    <Panel title="Call Stack" subtitle={stack.length ? `${stack.length} frame(s)` : "empty"}>
      <div className="list">
        {view.length ? (
          view.map((f, i) => (
            <div className="row" key={`${f.name}-${i}`}>
              <div className="rowMain">
                <div className="rowTitle">{f.name}</div>
                {activeLine ? <div className="rowSub">line {activeLine}</div> : null}
              </div>
              <div className="chip">{i === 0 ? "active" : "frame"}</div>
            </div>
          ))
        ) : (
          <div className="empty">No frames yet</div>
        )}
      </div>
    </Panel>
  );
}
