import Panel from "./Panel";

export default function VariablesPanel({ vars }: { vars: Record<string, any> }) {
  const entries = Object.entries(vars);

  return (
    <Panel title="Variables" subtitle={entries.length ? `${entries.length} value(s)` : "empty"}>
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
