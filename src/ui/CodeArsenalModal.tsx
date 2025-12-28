import { useEffect, useMemo, useState } from "react";
import { CODE_SNIPPETS } from "../arsenal/codeSnippets";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (code: string) => void;
};

export default function CodeArsenalModal({ open, onClose, onPick }: Props) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return CODE_SNIPPETS;
    return CODE_SNIPPETS.filter((x) => {
      const hay = `${x.title} ${x.tags.join(" ")}`.toLowerCase();
      return hay.includes(s);
    });
  }, [q]);

  if (!open) return null;

  return (
    <div className="arsenalOverlay" onMouseDown={onClose}>
      <div className="arsenalModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="arsenalHead">
          <div className="arsenalTitle">Code Arsenal</div>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="arsenalSearchRow">
          <input
            className="arsenalSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title or tag..."
            autoFocus
          />
          <div className="arsenalCount">{filtered.length} results</div>
        </div>

        <div className="arsenalGrid">
          {filtered.map((s) => (
            <button
              key={s.id}
              className="arsenalItem"
              onClick={() => {
                onPick(s.code);
                onClose();
              }}
            >
              <div className="arsenalItemTitle">{s.title}</div>
              <div className="arsenalTags">
                {s.tags.slice(0, 6).map((t) => (
                  <span className="arsenalTag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <pre className="arsenalPreview">{s.code}</pre>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
