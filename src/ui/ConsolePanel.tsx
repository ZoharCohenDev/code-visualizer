import Panel from "./Panel";
import { useStickToBottom } from "./useStickToBottom";

export default function ConsolePanel({ lines }: { lines: string[] }) {
  const { ref, onScroll } = useStickToBottom<HTMLDivElement>([lines.length]);

  return (
    <Panel
      title="Console"
      subtitle={lines.length ? `${lines.length} message(s)` : "empty"}
      bodyRef={ref}
      onBodyScroll={onScroll}
    >
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
