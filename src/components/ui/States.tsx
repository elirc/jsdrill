import { Button } from "./Button";
import { Card } from "./Card";

export function Spinner({ label }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-7 w-7 rounded-full animate-spin"
        aria-hidden
        style={{
          border: "2.5px solid var(--border)",
          borderTopColor: "var(--accent)",
        }}
      />
      <p className={label ? "text-[13px]" : "sr-only"} style={{ color: "var(--text-faint)" }}>
        {label ?? "Loading…"}
      </p>
    </div>
  );
}

type HeadingLevel = "h1" | "h2" | "h3";

export function EmptyState({
  icon,
  title,
  body,
  action,
  as: Heading = "h2",
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  /** Use "h1" when the empty state is the whole page. */
  as?: HeadingLevel;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && (
        <div className="text-3xl mb-3" style={{ color: "var(--text-faint)" }} aria-hidden>
          {icon}
        </div>
      )}
      <Heading className="text-base font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </Heading>
      {body && (
        <p className="text-sm mt-1.5 max-w-sm" style={{ color: "var(--text-muted)" }}>
          {body}
        </p>
      )}
      {action && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{action}</div>
      )}
    </div>
  );
}

/**
 * A failed load, with a way out. Fetch-backed pages render this
 * instead of spinning forever when a request fails.
 */
export function ErrorState({
  title = "Couldn’t load this",
  message,
  onRetry,
  extra,
  as = "h2",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  /** Extra actions beside "Try again", e.g. a way back. */
  extra?: React.ReactNode;
  as?: HeadingLevel;
}) {
  return (
    <Card padding="lg" role="alert">
      <EmptyState
        icon="⚠"
        as={as}
        title={title}
        body={message ?? "Something went wrong talking to the local server."}
        action={
          onRetry || extra ? (
            <>
              {onRetry && <Button onClick={onRetry}>Try again</Button>}
              {extra}
            </>
          ) : undefined
        }
      />
    </Card>
  );
}
