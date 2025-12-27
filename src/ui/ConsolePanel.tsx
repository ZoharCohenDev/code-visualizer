import Panel from "./Panel";

export default function ConsolePanel({ lines }: { lines: string[] }) {
  return (
    <Panel title="Console" subtitle={lines.length ? `${lines.length} message(s)` : "empty"}>
      <div className="console">
        {lines.length ? (
          lines.map((l, i) => (
            <div className="consoleLine" key={`${i}-${l}`}>
              <span className="consolePrompt">{">"}</span>
              <span className="consoleText">{l}</span>
            </div>
          ))
        ) : (
          <div className="empty">No output yet</div>
        )}
      </div>
    </Panel>
  );
}
