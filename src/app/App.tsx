import { useMemo, useState } from "react";
import { runCodeToSteps } from "../engine/interpreter";
import type { Step } from "../engine/types";
import "../index.css";

const DEFAULT_CODE = `let x = 1;
let y = 2;
console.log(x + y);
x += 10;
console.log(x);`;

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [steps, setSteps] = useState<Step[]>([]);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const current = steps[idx]?.state;

  const vars = useMemo(() => {
    if (!current?.stack?.length) return {};
    return current.stack[current.stack.length - 1].locals ?? {};
  }, [current]);

  const consoleLines = useMemo(() => {
    return current?.console ?? [];
  }, [current]);

  const label = steps[idx]?.label ?? "";

  const run = () => {
    const res = runCodeToSteps(code);
    setSteps(res.steps);
    setIdx(0);
    setError(res.error);
  };

  const canPrev = idx > 0;
  const canNext = idx < steps.length - 1;

  return (
    <div style={{ minHeight: "100vh", padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ margin: 0 }}>Code Trace (line by line)</h2>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        Paste code, press Run, then Next/Prev to watch variables + console update.
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            height: 190,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            padding: 12,
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.92)",
            outline: "none",
            fontSize: 14,
            lineHeight: 1.55,
            resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={run}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 800,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              cursor: "pointer",
            }}
          >
            Run
          </button>

          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={!canPrev}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 800,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              cursor: canPrev ? "pointer" : "not-allowed",
              opacity: canPrev ? 1 : 0.5,
            }}
          >
            Prev
          </button>

          <button
            onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
            disabled={!canNext}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 800,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              cursor: canNext ? "pointer" : "not-allowed",
              opacity: canNext ? 1 : 0.5,
            }}
          >
            Next
          </button>
        </div>

        {error ? (
          <div style={{ color: "salmon", fontWeight: 700 }}>
            Error: {error}
          </div>
        ) : null}

        <div style={{ opacity: 0.9 }}>
          <b>Step:</b> {steps.length ? `${idx} / ${steps.length - 1}` : "—"}{" "}
          <span style={{ opacity: 0.85 }}>
            {steps.length ? `| line ${current?.currentLine ?? 1}` : ""}
          </span>
          <div style={{ marginTop: 6, opacity: 0.85 }}>{label}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: 12,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <b>Variables</b>
            <pre style={{ margin: 0, marginTop: 10, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(vars, null, 2)}
            </pre>
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: 12,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <b>Console</b>
            <pre style={{ margin: 0, marginTop: 10, whiteSpace: "pre-wrap" }}>
              {consoleLines.join("\n")}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
