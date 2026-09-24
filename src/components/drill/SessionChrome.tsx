"use client";

import { cn } from "@/lib/utils";
import type { DrillItem } from "@/types";

/**
 * The bar pinned to the bottom of a drill: status on the left, the
 * primary action on the right. Wraps on narrow screens rather than
 * overflowing, and clears the iOS home indicator.
 */
export function ActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 px-4 pt-3 border-t backdrop-blur-xl",
        "flex flex-wrap items-center gap-x-3 gap-y-2",
        className
      )}
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--bg) 88%, transparent)",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      {children}
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="text-[10.5px] px-1.5 py-0.5 rounded border font-sans"
      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
    >
      {children}
    </kbd>
  );
}

function choiceCount(item: DrillItem): number {
  const payload = item.payload as { choices?: unknown[] };
  return payload.choices?.length ?? 0;
}

/** "1–4 to pick · Enter to check", adapted to the question in front of you. */
export function KeyHint({
  item,
  revealed,
  verb = "check",
}: {
  item: DrillItem;
  revealed: boolean;
  verb?: string;
}) {
  let content: React.ReactNode;

  if (revealed) {
    content = (
      <>
        <Key>Enter</Key> next
      </>
    );
  } else {
    const n = item.kind === "truefalse" ? 2 : choiceCount(item);
    // Multi-line editors keep plain Enter for newlines.
    const needsMod = item.kind === "code";
    content = (
      <>
        {n > 1 && (
          <>
            <Key>1</Key>–<Key>{Math.min(n, 9)}</Key> to pick ·{" "}
          </>
        )}
        {needsMod && (
          <>
            <Key>Ctrl</Key>+
          </>
        )}
        <Key>Enter</Key> to {item.kind === "short" ? "log" : item.kind === "code" ? "run" : verb}
      </>
    );
  }

  return (
    <span
      className="hidden sm:inline-flex items-center gap-1 text-[12px] whitespace-nowrap"
      style={{ color: "var(--text-faint)" }}
    >
      {content}
    </span>
  );
}
