"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentUnit } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";

type Props = {
  value: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
};

export function CodeEditor({ value, onChange, readOnly = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  // Keep the latest handler without re-creating the editor on every render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Mount once. Re-creating on `value` changes would fight the user's cursor.
  useEffect(() => {
    if (!host.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        indentUnit.of("  "),
        javascript(),
        oneDark,
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
        EditorView.theme({
          "&": { fontSize: "13.5px", borderRadius: "8px" },
          ".cm-scroller": {
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            lineHeight: "1.65",
          },
          ".cm-content": { minHeight: "180px", padding: "10px 0" },
          ".cm-gutters": { border: "none" },
        }),
      ],
    });

    view.current = new EditorView({ state, parent: host.current });

    return () => {
      view.current?.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (moving to the next item) without
  // clobbering the document while the user is typing.
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current === value) return;
    editor.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  // Lock the document once the answer is submitted.
  useEffect(() => {
    view.current?.contentDOM.setAttribute("contenteditable", readOnly ? "false" : "true");
  }, [readOnly]);

  return (
    <div
      ref={host}
      className="rounded-lg overflow-hidden border"
      style={{ borderColor: "var(--border)", opacity: readOnly ? 0.75 : 1 }}
    />
  );
}
