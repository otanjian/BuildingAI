import type { OpencodeSessionMessage } from "./opencode-live-preview";

export type OpencodeSessionEvent =
  | { type: "question.asked"; properties?: Record<string, unknown> }
  | { type: "question.replied"; properties?: Record<string, unknown> }
  | { type: "question.rejected"; properties?: Record<string, unknown> }
  | { type: "question.v2.asked"; properties?: Record<string, unknown> }
  | { type: "question.v2.replied"; properties?: Record<string, unknown> }
  | { type: "question.v2.rejected"; properties?: Record<string, unknown> }
  | {
      type: "message.updated";
      properties?: {
        info?: { id?: string; role?: string; finish?: string | null; error?: unknown };
      };
    }
  | {
      type: "message.part.updated";
      properties?: { part?: Record<string, unknown> };
    }
  | { type: "session.idle"; properties?: { sessionID?: string } }
  | { type: "session.error"; properties?: { sessionID?: string; error?: unknown } };

function groupEvents(events: OpencodeSessionEvent[]): OpencodeSessionMessage[] {
  const map = new Map<string, OpencodeSessionMessage & { parts: Array<Record<string, unknown>> }>();

  for (const event of events) {
    if (event.type === "message.updated") {
      const info = event.properties?.info;
      if (!info?.id || !info?.role) continue;
      map.set(String(info.id), {
        info: {
          id: String(info.id),
          role: String(info.role),
          finish: info.finish ?? null,
          error: info.error,
        },
        parts: [],
      });
      continue;
    }

    if (event.type === "message.part.updated") {
      const part = event.properties?.part;
      if (!part?.messageID || !part?.id) continue;
      const messageId = String(part.messageID);
      const existing = map.get(messageId);
      if (!existing) continue;
      const idx = existing.parts.findIndex((p) => String(p.id) === String(part.id));
      if (idx >= 0) existing.parts[idx] = part;
      else existing.parts.push(part);
    }
  }

  return Array.from(map.values());
}

export interface SubscribeOpencodeSessionEventsOptions {
  url: string;
  headers: Record<string, string>;
  signal: AbortSignal;
  onSnapshot?: (messages: OpencodeSessionMessage[]) => void;
  onDone?: (status: "idle" | "error") => void;
  onError?: (error: Error) => void;
  onQuestion?: (question: unknown | null) => void;
}

/**
 * Subscribe to the Bowi AI-proxied OpenCode event SSE and translate the
 * live stream into a running OpencodeSessionMessage snapshot.
 *
 * The caller can feed the snapshot into `buildOpencodeLivePreview` to render
 * a temporary assistant message while a detached turn is running.
 */
export async function subscribeOpencodeSessionEvents(
  options: SubscribeOpencodeSessionEventsOptions,
): Promise<void> {
  const { url, headers, signal, onSnapshot, onDone, onError, onQuestion } = options;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/event-stream", ...headers },
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenCode session events failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const events: OpencodeSessionEvent[] = [];

    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split(/\n\n+/);
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const dataLines = chunk
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());
        if (dataLines.length === 0) continue;
        const payload = dataLines.join("\n");
        if (!payload || payload === "[DONE]") continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const event = parsed as OpencodeSessionEvent;
        if (event.type === "question.asked" || event.type === "question.v2.asked") {
          onQuestion?.(event.properties ?? null);
          continue;
        }
        if (
          event.type === "question.replied" ||
          event.type === "question.rejected" ||
          event.type === "question.v2.replied" ||
          event.type === "question.v2.rejected"
        ) {
          onQuestion?.(null);
          continue;
        }
        if (event.type === "session.idle" || event.type === "session.error") {
          onDone?.(event.type === "session.idle" ? "idle" : "error");
          continue;
        }

        events.push(event);
        onSnapshot?.(groupEvents(events));
      }
    }
  } catch (error) {
    if (!signal.aborted) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
