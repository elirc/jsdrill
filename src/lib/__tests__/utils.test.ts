import { describe, expect, it } from "vitest";
import vm from "node:vm";
import {
  addLocalDays,
  deepEqual,
  escapeHtml,
  localDateKey,
  renderInline,
  renderMarkdown,
  startOfLocalDay,
  today,
} from "@/lib/utils";
import { streakFromDays } from "@/lib/progress";

describe("deepEqual", () => {
  it("treats NaN as equal to itself and 0 as equal to -0", () => {
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual(0, -0)).toBe(true);
    expect(deepEqual([0], [-0])).toBe(true);
  });

  it("distinguishes arrays from array-like objects", () => {
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
    expect(deepEqual([], {})).toBe(false);
  });

  it("compares nested structures and key order independently", () => {
    expect(deepEqual({ a: [1, { b: 2 }], c: "x" }, { c: "x", a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("follows JSON: undefined-valued keys count as absent", () => {
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: undefined }, { b: undefined })).toBe(true);
  });

  it("compares Dates by time, including across realms", () => {
    expect(deepEqual(new Date(5), new Date(5))).toBe(true);
    expect(deepEqual(new Date(5), new Date(6))).toBe(false);
    const foreign = vm.runInNewContext("new Date(5)");
    expect(deepEqual(foreign, new Date(5))).toBe(true);
    expect(deepEqual(new Date(5), 5)).toBe(false);
  });

  it("never calls a Map or Set equal to an empty object", () => {
    expect(deepEqual(new Map([["a", 1]]), {})).toBe(false);
    expect(deepEqual(new Set([1]), new Set([2]))).toBe(false);
    expect(deepEqual(new Map([["a", [1]]]), new Map([["a", [1]]]))).toBe(true);
  });

  it("distinguishes null, undefined and primitives of different types", () => {
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(1, "1")).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });

  it("does not overflow on cycles", () => {
    const a: Record<string, unknown> = { x: 1 };
    a.self = a;
    const b: Record<string, unknown> = { x: 1 };
    b.self = b;
    expect(deepEqual(a, b)).toBe(true);
  });
});

describe("renderMarkdown", () => {
  it("escapes HTML before anything else", () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(escapeHtml('"<&>')).toBe("&quot;&lt;&amp;&gt;");
  });

  it("renders fenced code verbatim, untouched by inline rules", () => {
    const html = renderMarkdown("Before\n\n```js\nconst x = a ** b * c;\n```\n\nAfter");
    expect(html).toContain('<pre class="md-pre"><code data-lang="js">const x = a ** b * c;</code></pre>');
    expect(html).not.toContain("<strong>");
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("\u0000");
  });

  it("does not apply emphasis inside inline code", () => {
    const html = renderMarkdown("Use `a * b * c` and `x ** y ** z` here");
    expect(html).toContain('<code class="md-code">a * b * c</code>');
    expect(html).toContain('<code class="md-code">x ** y ** z</code>');
    expect(html).not.toContain("<em>");
  });

  it("renders bold, italics and headings", () => {
    const html = renderMarkdown("## Title\n\nSome **bold** and *soft* text");
    expect(html).toContain('<h3 class="md-h">Title</h3>');
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>soft</em>");
  });

  it("renders tables, keeping a pipe inside inline code in its cell", () => {
    const html = renderMarkdown("| Op | Means |\n|---|---|\n| `a || b` | or |\n| `&&` | and |");
    expect(html).toContain("<th>Op</th><th>Means</th>");
    expect(html).toContain('<td><code class="md-code">a || b</code></td><td>or</td>');
    expect(html.match(/<tr>/g)).toHaveLength(3);
  });

  it("groups bullets and numbers into lists, and wraps the paragraph after", () => {
    const html = renderMarkdown("- one\n- *two*\n\n1. first\n2. second\n\nAfter the list");
    expect(html).toContain('<ul class="md-list"><li>one</li><li><em>two</em></li></ul>');
    expect(html).toContain('<ol class="md-list"><li>first</li><li>second</li></ol>');
    expect(html).toContain("<p>After the list</p>");
  });

  it("does not read a `* item` bullet as italics", () => {
    const html = renderMarkdown("* alpha\n* beta *gamma*");
    expect(html).toContain("<li>alpha</li>");
    expect(html).toContain("<li>beta <em>gamma</em></li>");
  });

  it("renders blockquotes", () => {
    expect(renderMarkdown("> careful")).toContain('<blockquote class="md-quote">careful</blockquote>');
  });
});

describe("renderInline", () => {
  it("escapes, formats inline code and emphasis, and keeps line breaks", () => {
    const html = renderInline("Is `a < b` **true**?\nMaybe *not*");
    expect(html).toBe(
      'Is <code class="md-code">a &lt; b</code> <strong>true</strong>?<br />Maybe <em>not</em>'
    );
  });

  it("leaves asterisks in code spans alone", () => {
    expect(renderInline("`*ptr` and `**kw`")).toBe(
      '<code class="md-code">*ptr</code> and <code class="md-code">**kw</code>'
    );
  });
});

describe("local dates", () => {
  it("localDateKey uses the local calendar day, not the UTC one", () => {
    const lateEvening = new Date(2026, 2, 14, 23, 30); // 14 March, 23:30 local
    expect(localDateKey(lateEvening)).toBe("2026-03-14");
    const earlyMorning = new Date(2026, 2, 15, 0, 15);
    expect(localDateKey(earlyMorning)).toBe("2026-03-15");
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("accepts ISO strings and agrees with today()", () => {
    const d = new Date(2026, 6, 4, 12);
    expect(localDateKey(d.toISOString())).toBe("2026-07-04");
    expect(today()).toBe(localDateKey(new Date()));
  });

  it("steps whole calendar days", () => {
    const start = startOfLocalDay(new Date(2026, 2, 31, 18));
    expect(localDateKey(addLocalDays(start, 1))).toBe("2026-04-01");
    expect(localDateKey(addLocalDays(start, -31))).toBe("2026-02-28");
  });
});

describe("streakFromDays", () => {
  const now = new Date(2026, 4, 10, 9); // 10 May
  const days = (...keys: string[]) => new Set(keys);

  it("counts consecutive days ending today", () => {
    expect(streakFromDays(days("2026-05-10", "2026-05-09", "2026-05-08"), now)).toBe(3);
  });

  it("keeps a streak that ended yesterday alive until today is over", () => {
    expect(streakFromDays(days("2026-05-09", "2026-05-08"), now)).toBe(2);
  });

  it("is zero after a missed day, and stops at a gap", () => {
    expect(streakFromDays(days("2026-05-08"), now)).toBe(0);
    expect(streakFromDays(days("2026-05-10", "2026-05-08"), now)).toBe(1);
    expect(streakFromDays(days(), now)).toBe(0);
  });
});
