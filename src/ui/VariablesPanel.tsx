import Panel from "./Panel";
import { useStickToBottom } from "./useStickToBottom";

export default function VariablesPanel({ vars }: { vars: Record<string, any> }) {
  const entries = Object.entries(vars);
  const { ref, onScroll } = useStickToBottom<HTMLDivElement>([entries.length]);

  return (
    <Panel
      title="Variables"
      subtitle={entries.length ? `${entries.length} value(s)` : "empty"}
      bodyRef={ref}
      onBodyScroll={onScroll}
    >
      <div className="kv">
        {entries.length ? (
          entries.map(([k, v]) => (
            <div className="kvRow" key={k}>
              <div className="kvKey">{k}</div>
              <div className="kvVal">{String(v)}</div>
            </div>
          ))
        ) : (
          <div className="empty">Run the code to see variables</div>
        )}
      </div>
    </Panel>
  );
}
