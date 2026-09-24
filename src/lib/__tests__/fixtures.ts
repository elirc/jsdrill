import type { Item, ItemKind, ItemPayload } from "@/types";

/** A minimal item of `kind` with the given payload. */
export function makeItem(kind: ItemKind, payload: ItemPayload, extra: Partial<Item> = {}): Item {
  return {
    id: `item-test-${kind}`,
    kind,
    trackId: "track-test",
    moduleId: "mod-test",
    level: 1,
    prompt: "Test prompt",
    payload,
    explanation: "Because.",
    conceptIds: [],
    estSeconds: 40,
    difficulty: 1,
    ...extra,
  };
}
