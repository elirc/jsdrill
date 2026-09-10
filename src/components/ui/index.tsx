"use client";

import { cn, renderInline, renderMarkdown, tint } from "@/lib/utils";

// ─── Button ───

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  style,
  ...props
}: ButtonProps) {
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--accent)", color: "#fff", border: "1px solid transparent" },
    secondary: {
      background: "var(--surface)",
      color: "var(--text)",
      border: "1px solid var(--border-strong)",
    },
    ghost: { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" },
    danger: { background: "var(--bad)", color: "#fff", border: "1px solid transparent" },
    success: { background: "var(--good)", color: "#04160f", border: "1px solid transparent" },
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[13px]",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-[15px]",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium rounded-lg",
        "transition-all duration-150 active:scale-[0.98]",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        "hover:brightness-110",
        sizes[size],
        className
      )}
      style={{ ...variants[variant], ...style }}
      {...props}
    />
  );
}

// ─── Card ───

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
  raised?: boolean;
  accent?: string;
};

export function Card({
  padding = "md",
  raised = false,
  accent,
  className,
  style,
  children,
  ...props
}: CardProps) {
  const paddings = { none: "", sm: "p-3", md: "p-5", lg: "p-7" };

  return (
    <div
      className={cn("rounded-xl border", paddings[padding], className)}
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

// ─── Badge ───

type BadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "good" | "bad" | "warn";
  color?: string;
  className?: string;
};

export function Badge({ children, tone = "neutral", color, className }: BadgeProps) {
  const tones: Record<string, React.CSSProperties> = {
    neutral: { background: "var(--bg-inset)", color: "var(--text-muted)", borderColor: "var(--border)" },
    accent: { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "transparent" },
    good: { background: "var(--good-soft)", color: "var(--good)", borderColor: "transparent" },
    bad: { background: "var(--bad-soft)", color: "var(--bad)", borderColor: "transparent" },
    warn: { background: "var(--warn-soft)", color: "var(--warn)", borderColor: "transparent" },
  };

  const style = color
    ? { background: tint(color, 0.14), color, borderColor: "transparent" }
    : tones[tone];

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

// ─── Progress bar ───

export function ProgressBar({
  value,
  color,
  height = 6,
  className,
}: {
  value: number;
  color?: string;
  height?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("w-full rounded-full overflow-hidden", className)}
      style={{ height, background: "var(--bg-inset)" }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: color ?? "var(--accent)" }}
      />
    </div>
  );
}

// ─── Progress ring ───

export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  color,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bg-inset)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ─── Markdown ───

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn("prose-reps", className)}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(children) }}
    />
  );
}

export function Inline({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn("prose-inline", className)}
      dangerouslySetInnerHTML={{ __html: renderInline(children) }}
    />
  );
}

// ─── Empty / loading states ───

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div
        className="h-7 w-7 rounded-full animate-spin"
        style={{
          border: "2.5px solid var(--border)",
          borderTopColor: "var(--accent)",
        }}
      />
      {label && (
        <p className="text-[13px]" style={{ color: "var(--text-faint)" }}>
          {label}
        </p>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && (
        <div className="text-3xl mb-3" style={{ color: "var(--text-faint)" }}>
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      {body && (
        <p className="text-sm mt-1.5 max-w-sm" style={{ color: "var(--text-muted)" }}>
          {body}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Stat tile ───

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
