import { cn, renderInline, renderMarkdown } from "@/lib/utils";

/** Block markdown (briefs, explanations). The renderer escapes HTML first. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn("prose-reps", className)}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(children) }}
    />
  );
}

/** Inline-only markdown (prompts, choices, key ideas). */
export function Inline({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn("prose-inline", className)}
      dangerouslySetInnerHTML={{ __html: renderInline(children) }}
    />
  );
}
