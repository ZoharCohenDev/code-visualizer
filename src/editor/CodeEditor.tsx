import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  activeLine?: number;
};

export default function CodeEditor({ value, onChange, activeLine }: Props) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  const decoration = useMemo(() => {
    if (!activeLine) return null;
    return {
      range: { startLineNumber: activeLine, startColumn: 1, endLineNumber: activeLine, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: "activeLineGlow",
        glyphMarginClassName: "activeLineGlyph",
      },
    };
  }, [activeLine]);

  useEffect(() => {
    if (!isReady || !editorRef.current || !monacoRef.current) return;
    if (!decoration) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const prev = (editor.__activeDecorations as string[] | undefined) || [];
    const next = editor.deltaDecorations(prev, [
      {
        range: new monaco.Range(
          decoration.range.startLineNumber,
          decoration.range.startColumn,
          decoration.range.endLineNumber,
          decoration.range.endColumn
        ),
        options: decoration.options,
      },
    ]);
    editor.__activeDecorations = next;

    editor.revealLineInCenter(activeLine);
  }, [isReady, decoration, activeLine]);

  return (
    <div className="editorWrap">
      <div className="editorTop">
        <div className="editorTitle">Code</div>
        <div className="editorHint">Run to generate steps, then Step through</div>
      </div>

      <div className="editorCard">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 22,
            tabSize: 2,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            renderLineHighlight: "none",
            glyphMargin: true,
            roundedSelection: true,
            padding: { top: 14, bottom: 14 },
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;

            const style = document.createElement("style");
            style.innerHTML = `
              .activeLineGlow{
                background: linear-gradient(90deg, rgba(124,92,255,0.22), rgba(45,226,230,0.12));
                border-left: 2px solid rgba(45,226,230,0.65);
              }
              .activeLineGlyph{
                background: linear-gradient(135deg, rgba(124,92,255,0.9), rgba(45,226,230,0.85));
                border-radius: 6px;
              }
            `;
            document.head.appendChild(style);

            setIsReady(true);
          }}
        />
      </div>
    </div>
  );
}
