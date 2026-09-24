import { cn, tint } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
  raised?: boolean;
  /** A track hex colour for the border. */
  accent?: string;
};

const PADDINGS = { none: "", sm: "p-3", md: "p-5", lg: "p-7" };

export function Card({
  padding = "md",
  raised = false,
  accent,
  className,
  style,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn("rounded-xl border", PADDINGS[padding], className)}
      style={{
        background: raised ? "var(--bg-raised)" : "var(--surface)",
        borderColor: accent ? tint(accent, 0.28) : "var(--border)",
        boxShadow: raised ? "var(--shadow)" : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/** A labelled headline number. */
export function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <Card padding="md">
      <div
        className="text-[11px] font-medium uppercase tracking-wider"
        style={{ color: "var(--text-faint)" }}
      >
        {label}
      </div>
      <div
        className="text-2xl font-semibold mt-1.5 tabular-nums"
        style={{ color: color ?? "var(--text)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {sub}
        </div>
      )}
    </Card>
  );
}
