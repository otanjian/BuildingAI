export type OpencodeProjectionEvent = {
  type: "projection";
  id: string;
  data: {
    conversationId: string;
    turnId: string;
    version: string;
    projection: Record<string, unknown>;
    updatedAt?: string | null;
  };
};

export type OpencodeTerminalEvent = {
  type: "terminal";
  id: string;
  data: {
    conversationId: string;
    turnId: string;
    status: "completed" | "cancelled" | "failed";
    assistantMessageId: string;
  };
};

export type OpencodeTurnDisplayEvent = OpencodeProjectionEvent | OpencodeTerminalEvent;

type Fetcher = typeof fetch;

export async function subscribeOpencodeTurnEvents(options: {
  url: string;
  headers: Record<string, string>;
  signal: AbortSignal;
  lastEventId?: string;
  fetcher?: Fetcher;
  onEvent: (event: OpencodeTurnDisplayEvent) => void | Promise<void>;
}): Promise<void> {
  const response = await (options.fetcher ?? fetch)(options.url, {
    method: "GET",
    signal: options.signal,
    headers: {
      Accept: "text/event-stream",
      ...options.headers,
      ...(options.lastEventId ? { "Last-Event-ID": options.lastEventId } : {}),
    },
  });
  if (!response.ok || !response.body) {
    throw new Error(`OpenCode turn events failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (!options.signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    const frames = buffer.split(/\n\n+/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const parsed = parseFrame(frame);
      if (parsed) await options.onEvent(parsed);
    }
  }
}

function parseFrame(frame: string): OpencodeTurnDisplayEvent | null {
  if (!frame || frame.startsWith(":")) return null;
  let id = "";
  let type = "";
  const data: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("id:")) id = line.slice(3).trim();
    if (line.startsWith("event:")) type = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!id || (type !== "projection" && type !== "terminal") || data.length === 0) return null;
  try {
    return { type, id, data: JSON.parse(data.join("\n")) } as OpencodeTurnDisplayEvent;
  } catch {
    return null;
  }
}
