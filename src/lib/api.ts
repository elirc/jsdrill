/**
 * Small helpers shared by the route handlers.
 *
 * Every route answers with the same envelope — `{ success, data }` or
 * `{ success: false, error }` — so these only remove the repetition;
 * they do not change any response shape.
 */
import { NextResponse } from "next/server";

export function ok<T>(data?: T, init?: ResponseInit) {
  return NextResponse.json(
    data === undefined ? { success: true } : { success: true, data },
    init
  );
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/** Result of a body validator: the typed value, or why it was rejected. */
export type Checked<T> = { value: T } | { error: string };

export type Guard<T> = (body: unknown) => Checked<T>;

/** Bodies larger than this are refused before parsing. */
export const MAX_BODY_BYTES = 256 * 1024;

/**
 * Reads, size-limits, parses and validates a JSON body.
 *
 * Returns either `{ value }` or `{ response }` — a ready 4xx to return
 * as-is — so a route never has to try/catch `request.json()` itself.
 */
export async function parseJson<T>(
  request: Request,
  guard: Guard<T>,
  maxBytes = MAX_BODY_BYTES
): Promise<{ value: T; response?: undefined } | { value?: undefined; response: NextResponse }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return { response: fail("Request body too large", 413) };

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { response: fail("Could not read request body", 400) };
  }
  // Content-Length can be absent (chunked) or wrong; measure the real thing.
  if (text.length > maxBytes) return { response: fail("Request body too large", 413) };

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { response: fail("Request body must be valid JSON", 400) };
  }

  const checked = guard(body);
  if ("error" in checked) return { response: fail(checked.error, 400) };
  return { value: checked.value };
}

// ─── Small validation vocabulary ───

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function isStringArray(v: unknown, maxLength = 200): v is string[] {
  return Array.isArray(v) && v.length <= maxLength && v.every((x) => typeof x === "string");
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Logs the real error server-side and answers with a generic 500 —
 * the client gets `message`, never a stack trace or SQL.
 */
export function serverError(message: string, error: unknown) {
  console.error(`${message}:`, error);
  return fail(message, 500);
}
