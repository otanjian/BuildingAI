import type { UIMessage } from "ai";

import { recordOpencodeConversationMetric } from "./opencode-conversation-telemetry";
import type { OpencodePendingQuestion } from "./opencode-turn-client";

export type OpencodeConversationScroll = { top: number; atBottom: boolean };

export type OpencodeConversationEntry = {
  id: string;
  messages: UIMessage[];
  draft: string;
  scroll: OpencodeConversationScroll;
  localOnly: boolean;
  activeTurnId: string | null;
  projectionVersion: string;
  pendingQuestion: OpencodePendingQuestion | null;
  touchedAt: number;
};

const EMPTY_SCROLL: OpencodeConversationScroll = { top: 0, atBottom: true };

export class OpencodeConversationStore {
  private readonly entries = new Map<string, OpencodeConversationEntry>();
  private readonly listeners = new Set<() => void>();
  private readonly createId: () => string;
  private readonly maxEntries: number;
  private clock = 0;
  private activeId: string | null = null;

  constructor(options?: { createId?: () => string; maxEntries?: number }) {
    this.createId = options?.createId ?? (() => crypto.randomUUID());
    this.maxEntries = options?.maxEntries ?? 20;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  createDraft(stableId?: string): string {
    const id = stableId ?? this.createId();
    this.commit(id, { ...this.empty(id), localOnly: true });
    this.activate(id);
    return id;
  }

  activate(id: string): void {
    recordOpencodeConversationMetric(this.entries.has(id) ? "cache_hit" : "cache_miss");
    this.activeId = id;
    this.commit(id, this.get(id));
  }

  get(id: string): OpencodeConversationEntry {
    let entry = this.entries.get(id);
    if (!entry) {
      entry = this.empty(id);
      this.entries.set(id, entry);
    }
    return entry;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  isLocalDraft(id: string): boolean {
    return this.entries.get(id)?.localOnly === true;
  }

  setMessages(id: string, value: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])): void {
    const current = this.get(id);
    const messages = typeof value === "function" ? value(current.messages) : value;
    this.commit(id, { ...current, messages: [...messages] });
  }

  markPersisted(id: string): void {
    const current = this.get(id);
    if (!current.localOnly) return;
    this.commit(id, { ...current, localOnly: false });
  }

  setDraft(id: string, draft: string): void {
    this.commit(id, { ...this.get(id), draft });
  }

  setScroll(id: string, scroll: OpencodeConversationScroll): void {
    this.commit(id, { ...this.get(id), scroll: { ...scroll } });
  }

  beginTurn(id: string, input: { turnId: string; userMessage: UIMessage }): void {
    const current = this.get(id);
    const withoutTurn = current.messages.filter((message) => this.turnId(message) !== input.turnId);
    this.commit(id, {
      ...current,
      messages: [...withoutTurn, input.userMessage],
      activeTurnId: input.turnId,
      projectionVersion: "0",
    });
  }

  applyProjection(
    id: string,
    input: {
      turnId: string;
      version: string;
      projection: Record<string, unknown>;
    },
  ): boolean {
    const current = this.get(id);
    if (current.activeTurnId && current.activeTurnId !== input.turnId) return false;
    if (this.version(input.version) <= this.version(current.projectionVersion)) return false;
    const parts = Array.isArray(input.projection.parts) ? input.projection.parts : [];
    const projectionMessage: UIMessage = {
      id: `opencode-projection:${input.turnId}`,
      role: "assistant",
      parts: parts as UIMessage["parts"],
      metadata: {
        opencodeTurnId: input.turnId,
        opencodeProjection: true,
        projectionVersion: input.version,
      },
    };
    const messages = current.messages.filter((message) => message.id !== projectionMessage.id);
    this.commit(id, {
      ...current,
      messages: [...messages, projectionMessage],
      activeTurnId: input.turnId,
      projectionVersion: input.version,
    });
    recordOpencodeConversationMetric("projection_applied", {
      truncated: input.projection.truncated === true,
    });
    return true;
  }

  completeTurn(id: string, turnId: string, durableMessages: UIMessage[]): void {
    const current = this.get(id);
    if (current.activeTurnId && current.activeTurnId !== turnId) return;
    this.commit(id, {
      ...current,
      messages: [...durableMessages],
      localOnly: false,
      activeTurnId: null,
      projectionVersion: "0",
      pendingQuestion: null,
    });
  }

  setPendingQuestion(id: string, question: OpencodePendingQuestion | null): void {
    this.commit(id, { ...this.get(id), pendingQuestion: question ? { ...question } : null });
  }

  discardDraft(id: string): boolean {
    const current = this.entries.get(id);
    if (
      !current?.localOnly ||
      current.messages.length > 0 ||
      current.draft.trim() ||
      current.activeTurnId
    ) {
      return false;
    }
    this.entries.delete(id);
    if (this.activeId === id) this.activeId = null;
    this.emit();
    return true;
  }

  private commit(id: string, entry: OpencodeConversationEntry): void {
    this.entries.set(id, { ...entry, id, touchedAt: ++this.clock });
    this.evict();
    this.emit();
  }

  private evict(): void {
    while (this.entries.size > this.maxEntries) {
      const candidate = [...this.entries.values()]
        .filter((entry) => entry.id !== this.activeId && !entry.activeTurnId)
        .sort((left, right) => left.touchedAt - right.touchedAt)[0];
      if (!candidate) return;
      this.entries.delete(candidate.id);
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private empty(id: string): OpencodeConversationEntry {
    return {
      id,
      messages: [],
      draft: "",
      scroll: EMPTY_SCROLL,
      localOnly: false,
      activeTurnId: null,
      projectionVersion: "0",
      pendingQuestion: null,
      touchedAt: 0,
    };
  }

  private version(value: string): bigint {
    try {
      return BigInt(value);
    } catch {
      return -1n;
    }
  }

  private turnId(message: UIMessage): string | undefined {
    const metadata = message.metadata as { opencodeTurnId?: string } | undefined;
    return metadata?.opencodeTurnId;
  }
}

const stores = new Map<string, OpencodeConversationStore>();

export function getOpencodeConversationStore(scope: string): OpencodeConversationStore {
  let store = stores.get(scope);
  if (!store) {
    store = new OpencodeConversationStore();
    stores.set(scope, store);
  }
  return store;
}
