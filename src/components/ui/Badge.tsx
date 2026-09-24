import { cn, tint } from "@/lib/utils";

export type BadgeTone = "neutral" | "accent" | "good" | "bad" | "warn";

const TONES: Record<BadgeTone, React.CSSProperties> = {
  neutral: { background: "var(--bg-inset)", color: "var(--text-muted)", borderColor: "var(--border)" },
  accent: { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "transparent" },
  good: { background: "var(--good-soft)", color: "var(--good)", borderColor: "transparent" },
  bad: { background: "var(--bad-soft)", color: "var(--bad)", borderColor: "transparent" },
  warn: { background: "var(--warn-soft)", color: "var(--warn)", borderColor: "transparent" },
};

export function Badge({
  children,
  tone = "neutral",
  color,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  /** A track hex colour; overrides `tone`. */
  color?: string;
  className?: string;
}) {
  const style = color
    ? { background: tint(color, 0.14), color, borderColor: "transparent" }
    : TONES[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border",
        "text-[11px] font-medium tracking-wide whitespace-nowrap",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
