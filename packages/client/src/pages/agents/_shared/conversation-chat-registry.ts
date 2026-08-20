/**
 * Per-conversation Chat registry: keeps live AI SDK Chat instances alive across
 * focus switches so multiple agent conversations can stream in parallel.
 */

export type ChatEntryStatus = "idle" | "streaming" | "completed" | "error";

export type ConversationChatEntry<TChat = unknown> = {
  conversationId: string;
  chat: TChat;
  status: ChatEntryStatus;
  updatedAt: number;
};

export const DEFAULT_MAX_CONCURRENT_LIVE_STREAMS = 4;

const DEFAULT_REFUSE_REASON =
  "Too many conversations are generating at once. Wait for one to finish.";

export function canStartLiveStream(params: {
  streamingCount: number;
  maxConcurrent?: number;
  conversationAlreadyStreaming?: boolean;
}): { allowed: true } | { allowed: false; reason: string } {
  if (params.conversationAlreadyStreaming) {
    return { allowed: true };
  }
  const max = params.maxConcurrent ?? DEFAULT_MAX_CONCURRENT_LIVE_STREAMS;
  if (params.streamingCount >= max) {
    return { allowed: false, reason: DEFAULT_REFUSE_REASON };
  }
  return { allowed: true };
}

export class ConversationChatRegistry<TChat = unknown> {
  private readonly entries = new Map<string, ConversationChatEntry<TChat>>();
  private activeId: string | undefined;

  getOrCreate(conversationId: string, factory: () => TChat): TChat {
    const existing = this.entries.get(conversationId);
    if (existing) return existing.chat;

    const chat = factory();
    this.entries.set(conversationId, {
      conversationId,
      chat,
      status: "idle",
      updatedAt: Date.now(),
    });
    return chat;
  }

  get(conversationId: string): TChat | undefined {
    return this.entries.get(conversationId)?.chat;
  }

  getEntry(conversationId: string): ConversationChatEntry<TChat> | undefined {
    return this.entries.get(conversationId);
  }

  setActive(conversationId: string | undefined): void {
    this.activeId = conversationId;
  }

  getActive(): string | undefined {
    return this.activeId;
  }

  setStatus(conversationId: string, status: ChatEntryStatus): void {
    const entry = this.entries.get(conversationId);
    if (!entry) return;
    entry.status = status;
    entry.updatedAt = Date.now();
  }

  isStreaming(conversationId: string): boolean {
    return this.entries.get(conversationId)?.status === "streaming";
  }

  /**
   * Move an entry from a provisional key (e.g. `new-1`) to a stable conversation UUID
   * without recreating the Chat instance.
   */
  rekey(fromId: string, toId: string): boolean {
    if (!fromId || !toId || fromId === toId) return false;
    const entry = this.entries.get(fromId);
    if (!entry) return false;
    if (this.entries.has(toId)) return false;
    this.entries.delete(fromId);
    entry.conversationId = toId;
    this.entries.set(toId, entry);
    if (this.activeId === fromId) this.activeId = toId;
    return true;
  }

  dispose(conversationId: string): boolean {
    if (!this.entries.has(conversationId)) return false;
    this.entries.delete(conversationId);
    if (this.activeId === conversationId) {
      this.activeId = undefined;
    }
    return true;
  }

  countStreaming(): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.status === "streaming") count += 1;
    }
    return count;
  }

  /**
   * Remove completed (or error) entries that have been idle longer than the threshold.
   * Never evicts streaming entries.
   */
  evictCompletedIdle(options?: { olderThanMs?: number; now?: number }): string[] {
    const olderThanMs = options?.olderThanMs ?? 30_000;
    const now = options?.now ?? Date.now();
    const evicted: string[] = [];

    for (const [id, entry] of this.entries) {
      if (entry.status !== "completed" && entry.status !== "error") continue;
      if (now - entry.updatedAt < olderThanMs) continue;
      this.entries.delete(id);
      if (this.activeId === id) this.activeId = undefined;
      evicted.push(id);
    }

    return evicted;
  }

  listConversationIds(): string[] {
    return [...this.entries.keys()];
  }
}

/** Agent-scoped registries so detail and site-chat do not collide incorrectly. */
const registriesByScope = new Map<string, ConversationChatRegistry>();

export function getConversationChatRegistry(scopeKey: string): ConversationChatRegistry {
  let registry = registriesByScope.get(scopeKey);
  if (!registry) {
    registry = new ConversationChatRegistry();
    registriesByScope.set(scopeKey, registry);
  }
  return registry;
}

/** Test helper: clear module-scoped registries. */
export function resetConversationChatRegistriesForTests(): void {
  registriesByScope.clear();
}
