import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, React.CSSProperties> = {
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

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[13px]",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-[15px]",
};

const BASE = cn(
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg",
  "transition-all duration-150 active:scale-[0.98]",
  "hover:brightness-110"
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  style,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        BASE,
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        SIZES[size],
        className
      )}
      style={{ ...VARIANTS[variant], ...style }}
      {...props}
    />
  );
}

type LinkButtonProps = Omit<React.ComponentProps<typeof Link>, "style"> & {
  variant?: Variant;
  size?: Size;
  style?: React.CSSProperties;
};

/**
 * A link styled as a button. Use this instead of wrapping a <Button>
 * in a <Link>: a button inside an anchor is invalid HTML and gives
 * keyboard users two tab stops for one action.
 */
export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  style,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(BASE, SIZES[size], className)}
      style={{ ...VARIANTS[variant], ...style }}
      {...props}
    />
  );
}
