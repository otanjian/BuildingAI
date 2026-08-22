export type OpencodeConversationMetric =
  | "cache_hit"
  | "cache_miss"
  | "projection_applied"
  | "projection_truncated"
  | "poll_fallback";

const counters = new Map<OpencodeConversationMetric, number>();

export function recordOpencodeConversationMetric(
  name: Exclude<OpencodeConversationMetric, "projection_truncated">,
  fields: { scope?: string; truncated?: boolean } = {},
): void {
  counters.set(name, (counters.get(name) ?? 0) + 1);
  if (name === "projection_applied" && fields.truncated) {
    counters.set("projection_truncated", (counters.get("projection_truncated") ?? 0) + 1);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("buildingai:opencode-metric", {
        detail: {
          name,
          ...(fields.scope ? { scope: fields.scope } : {}),
          ...(fields.truncated ? { truncated: true } : {}),
        },
      }),
    );
  }
}

export function getOpencodeConversationTelemetry(): Partial<
  Record<OpencodeConversationMetric, number>
> {
  return Object.fromEntries(counters);
}

export function resetOpencodeConversationTelemetry(): void {
  counters.clear();
}
