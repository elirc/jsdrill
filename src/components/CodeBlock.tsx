"use client";

import { useMemo } from "react";
import { cn, escapeHtml } from "@/lib/utils";
import type { CodeLang } from "@/types";

/**
 * A small, deliberately-approximate tokeniser.
 *
 * Snippets here are short and read-only, so a full parser (and the
 * bundle it costs) is not worth it — this covers strings, comments,
 * numbers, keywords and call sites across JS/TS/C#/SQL well enough
 * that code reads as code.
 */

const KEYWORDS: Record<string, string[]> = {
  js: [
    "const","let","var","function","return","if","else","for","while","do","break","continue",
    "new","class","extends","super","this","typeof","instanceof","in","of","try","catch",
    "finally","throw","async","await","yield","import","export","from","default","null",
    "undefined","true","false","switch","case","delete","void","static","get","set",
  ],
  ts: [
    "interface","type","enum","implements","public","private","protected","readonly","as",
    "keyof","infer","never","unknown","any","string","number","boolean","satisfies","declare",
    "namespace","abstract","override",
  ],
  cs: [
    "using","namespace","class","struct","record","interface","enum","public","private",
    "protected","internal","static","readonly","const","void","var","new","return","if","else",
    "for","foreach","while","switch","case","default","break","continue","try","catch","finally",
    "throw","async","await","this","base","null","true","false","virtual","override","abstract",
    "sealed","partial","get","set","int","string","bool","decimal","double","float","object",
    "is","as","in","out","ref","params","where","select","from","yield","lock","nameof","when",
  ],
  sql: [
    "SELECT","FROM","WHERE","JOIN","INNER","LEFT","RIGHT","FULL","OUTER","CROSS","ON","GROUP",
    "BY","HAVING","ORDER","LIMIT","OFFSET","INSERT","INTO","VALUES","UPDATE","SET","DELETE",
    "CREATE","TABLE","INDEX","ALTER","DROP","AND","OR","NOT","NULL","IS","IN","EXISTS","AS",
    "DISTINCT","COUNT","SUM","AVG","MIN","MAX","CASE","WHEN","THEN","ELSE","END","UNION","ASC","DESC",
  ],
  bash: ["npm","npx","git","cd","echo","export","dotnet","node","yarn","pnpm","docker","if","then","fi"],
};

function keywordsFor(lang: CodeLang): Set<string> {
  switch (lang) {
    case "typescript":
    case "tsx":
      return new Set([...KEYWORDS.js, ...KEYWORDS.ts]);
    case "csharp":
      return new Set(KEYWORDS.cs);
    case "sql":
      return new Set(KEYWORDS.sql);
    case "bash":
      return new Set(KEYWORDS.bash);
    case "json":
    case "text":
    case "html":
    case "css":
      return new Set();
    default:
      return new Set(KEYWORDS.js);
  }
}

function highlight(code: string, lang: CodeLang): string {
  const keywords = keywordsFor(lang);
  const caseInsensitive = lang === "sql";

  // Split into "protected" spans (strings/comments) and plain code, so
  // keyword matching never reaches inside a string literal.
  const pattern =
    /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|--[^\n]*|#[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;

  const parts = code.split(pattern);

  return parts
    .map((part, i) => {
      if (!part) return "";

      // Odd indices are the captured strings/comments.
      if (i % 2 === 1) {
        const isComment = /^(\/\/|\/\*|--|#)/.test(part);
        return `<span class="${isComment ? "tok-com" : "tok-str"}">${escapeHtml(part)}</span>`;
      }

      let out = escapeHtml(part);

      // Numbers.
      out = out.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?[nm]?)\b/gi, '<span class="tok-num">$1</span>');

      // Identifiers followed by "(" read as calls.
      out = out.replace(
        /\b([A-Za-z_$][\w$]*)\b(?=\s*\()/g,
        (match, name: string) => {
          const lookup = caseInsensitive ? name.toUpperCase() : name;
          if (keywords.has(lookup)) return match;
          return `<span class="tok-fn">${name}</span>`;
        }
      );

      // Keywords.
      out = out.replace(/\b([A-Za-z_$][\w$]*)\b/g, (match, word: string) => {
        const lookup = caseInsensitive ? word.toUpperCase() : word;
        if (keywords.has(lookup)) return `<span class="tok-key">${word}</span>`;
        // Type-ish: PascalCase identifiers.
        if (/^[A-Z][a-zA-Z0-9]*$/.test(word) && word.length > 1) {
          return `<span class="tok-typ">${word}</span>`;
        }
        return match;
      });

      return out;
    })
    .join("");
}

const LANG_LABEL: Partial<Record<CodeLang, string>> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  csharp: "C#",
  sql: "SQL",
  bash: "Shell",
  json: "JSON",
  html: "HTML",
  css: "CSS",
};

export function CodeBlock({
  code,
  lang = "javascript",
  className,
  showLabel = true,
}: {
  code: string;
  lang?: CodeLang;
  className?: string;
  showLabel?: boolean;
}) {
  const html = useMemo(() => highlight(code, lang), [code, lang]);
  const label = LANG_LABEL[lang];

  return (
    <div
      className={cn("relative rounded-lg border overflow-hidden", className)}
      style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}
    >
      {showLabel && label && (
        <div
          className="absolute top-2 right-3 text-[10px] font-medium uppercase tracking-wider pointer-events-none select-none"
          style={{ color: "var(--text-faint)" }}
        >
          {label}
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3.5 text-[13px] leading-[1.65]">
        <code
          className="font-mono"
          style={{ color: "var(--text)" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}

/** Single-line inline code, used inside choice options. */
export function CodeInline({ code, lang = "javascript" }: { code: string; lang?: CodeLang }) {
  const html = useMemo(() => highlight(code, lang), [code, lang]);
  return (
    <code
      className="font-mono text-[13px] whitespace-pre-wrap"
      style={{ color: "var(--text)" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
