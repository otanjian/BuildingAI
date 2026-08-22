export type OpencodeTurnStatus =
  | "accepted"
  | "running"
  | "committing"
  | "completed"
  | "cancelled"
  | "failed";

export type OpencodeTurnStatusResult = {
  conversationId: string;
  turnId: string;
  status: OpencodeTurnStatus;
  cancelRequested: boolean;
  assistantMessageId: string | null;
  error: { code: string | null; message: string | null } | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  liveProjection?: Record<string, unknown> | null;
  projectionVersion?: string;
  projectionUpdatedAt?: string | null;
  pendingQuestion?: OpencodePendingQuestion | null;
};

export type OpencodePendingQuestion = {
  requestId: string;
  sessionId: string;
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description: string }>;
    multiple: boolean;
    custom: boolean;
  }>;
};

export function normalizeOpencodePendingQuestion(value: unknown): OpencodePendingQuestion | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const requestId = String(row.requestId ?? row.id ?? "");
  const sessionId = String(row.sessionId ?? row.sessionID ?? "");
  if (!requestId || !sessionId || !Array.isArray(row.questions)) return null;
  const questions = row.questions.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const q = item as Record<string, unknown>;
    if (typeof q.question !== "string" || typeof q.header !== "string") return [];
    const options = Array.isArray(q.options)
      ? q.options.flatMap((option) => {
          if (!option || typeof option !== "object") return [];
          const o = option as Record<string, unknown>;
          return typeof o.label === "string" && typeof o.description === "string"
            ? [{ label: o.label, description: o.description }]
            : [];
        })
      : [];
    return [
      {
        question: q.question,
        header: q.header,
        options,
        multiple: q.multiple === true,
        custom: q.custom !== false,
      },
    ];
  });
  return questions.length ? { requestId, sessionId, questions } : null;
}

export type OpencodeTurnActivity = Pick<
  OpencodeTurnStatusResult,
  "conversationId" | "turnId" | "status" | "cancelRequested" | "lastActivityAt"
>;

export type OpencodeTurnCommand = {
  conversationId?: string;
  message: {
    role: "user";
    parts: Array<
      | { type: "text"; text: string }
      | { type: "file"; mediaType: string; url: string; filename?: string }
    >;
  };
  formVariables?: Record<string, string>;
  formFieldsInputs?: Record<string, unknown>;
  isDebug?: boolean;
};

export type AcceptedOpencodeTurn = {
  conversationId: string;
  turnId: string;
  status: OpencodeTurnStatus;
  duplicate?: boolean;
};

export type PreparedOpencodeTurn = OpencodeTurnCommand & {
  conversationId: string;
  turnId: string;
};

export type OpencodeTurnTransport = {
  accept: (
    input: OpencodeTurnCommand & { conversationId: string; turnId: string },
    options: { signal?: AbortSignal },
  ) => Promise<AcceptedOpencodeTurn>;
  getStatus: (
    turnId: string,
    options: { signal?: AbortSignal },
  ) => Promise<OpencodeTurnStatusResult>;
  stop: (turnId: string, options: { signal?: AbortSignal }) => Promise<OpencodeTurnStatusResult>;
};

export type OpencodeTurnClientSnapshot = {
  activities: OpencodeTurnActivity[];
};

type OpencodeTurnClientOptions = {
  transport: OpencodeTurnTransport;
  createId?: () => string;
  pollIntervalMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  onTerminal?: (status: OpencodeTurnStatusResult) => void | Promise<void>;
  onAccepted?: (turn: AcceptedOpencodeTurn) => void | Promise<void>;
  onStatus?: (status: OpencodeTurnStatusResult) => void | Promise<void>;
};

const ACTIVE_STATUSES = new Set<OpencodeTurnStatus>(["accepted", "running", "committing"]);

export class DeterministicOpencodeTurnClient {
  private readonly transport: OpencodeTurnTransport;
  private readonly createId: () => string;
  private readonly pollIntervalMs: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;
  private readonly onTerminal?: OpencodeTurnClientOptions["onTerminal"];
  private readonly onAccepted?: OpencodeTurnClientOptions["onAccepted"];
  private readonly onStatus?: OpencodeTurnClientOptions["onStatus"];
  private readonly activities = new Map<string, OpencodeTurnActivity>();
  private readonly conversationTurns = new Map<string, string>();
  private readonly inFlight = new Map<string, Promise<OpencodeTurnStatusResult | undefined>>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly failures = new Map<string, number>();
  private readonly realtimeHealthy = new Set<string>();
  private readonly terminalNotified = new Set<string>();
  private readonly acceptedNotified = new Set<string>();
  private readonly pendingAccepts = new Map<string, PreparedOpencodeTurn>();
  private readonly listeners = new Set<() => void>();
  private snapshot: OpencodeTurnClientSnapshot = { activities: [] };
  private disposed = false;

  constructor(options: OpencodeTurnClientOptions) {
    this.transport = options.transport;
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.retryBaseMs = options.retryBaseMs ?? 1_000;
    this.retryMaxMs = options.retryMaxMs ?? 10_000;
    this.onTerminal = options.onTerminal;
    this.onAccepted = options.onAccepted;
    this.onStatus = options.onStatus;
  }

  getSnapshot = (): OpencodeTurnClientSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  prepare(command: OpencodeTurnCommand): PreparedOpencodeTurn {
    const conversationId = command.conversationId ?? this.createId();
    const activeTurnId = this.conversationTurns.get(conversationId);
    if (activeTurnId) {
      throw new Error(`Conversation already has active OpenCode turn ${activeTurnId}`);
    }
    return {
      ...command,
      conversationId,
      turnId: this.createId(),
    };
  }

  accept(command: OpencodeTurnCommand, options: { signal?: AbortSignal } = {}) {
    return this.acceptPrepared(this.prepare(command), options);
  }

  async acceptPrepared(
    input: PreparedOpencodeTurn,
    options: { signal?: AbortSignal } = {},
  ): Promise<AcceptedOpencodeTurn> {
    this.pendingAccepts.set(input.turnId, input);
    this.setActivity({
      conversationId: input.conversationId,
      turnId: input.turnId,
      status: "accepted",
      cancelRequested: false,
      lastActivityAt: new Date().toISOString(),
    });

    try {
      const accepted = await this.transport.accept(input, options);
      this.pendingAccepts.delete(input.turnId);
      await this.notifyAccepted(accepted);
      this.setActivity({
        conversationId: accepted.conversationId,
        turnId: accepted.turnId,
        status: accepted.status,
        cancelRequested: false,
        lastActivityAt: new Date().toISOString(),
      });
      this.schedule(accepted.turnId, this.pollIntervalMs);
      return accepted;
    } catch (acceptError) {
      if (this.isClientRejection(acceptError)) {
        this.removeActivity(input.turnId);
        throw acceptError;
      }
      try {
        const recovered = await this.transport.getStatus(input.turnId, options);
        this.pendingAccepts.delete(input.turnId);
        await this.notifyAccepted({
          conversationId: recovered.conversationId,
          turnId: recovered.turnId,
          status: recovered.status,
          duplicate: true,
        });
        await this.applyStatus(recovered);
        return {
          conversationId: recovered.conversationId,
          turnId: recovered.turnId,
          status: recovered.status,
          duplicate: true,
        };
      } catch {
        this.scheduleRetry(input.turnId);
        throw acceptError;
      }
    }
  }

  hydrate(summary: OpencodeTurnStatusResult | OpencodeTurnActivity): void {
    if (!ACTIVE_STATUSES.has(summary.status)) {
      this.removeActivity(summary.turnId);
      return;
    }
    this.setActivity({
      conversationId: summary.conversationId,
      turnId: summary.turnId,
      status: summary.status,
      cancelRequested: summary.cancelRequested,
      lastActivityAt: summary.lastActivityAt,
    });
    this.schedule(summary.turnId, this.pollIntervalMs);
  }

  pollNow(turnId: string, options: { signal?: AbortSignal } = {}) {
    const existing = this.inFlight.get(turnId);
    if (existing) return existing;
    this.clearTimer(turnId);
    const request = (
      this.pendingAccepts.has(turnId)
        ? this.recoverPendingAcceptance(turnId, options)
        : this.transport.getStatus(turnId, options)
    )
      .then(async (status) => {
        this.failures.delete(turnId);
        await this.applyStatus(status);
        return status;
      })
      .catch(() => {
        if (this.activities.has(turnId)) this.scheduleRetry(turnId);
        return undefined;
      })
      .finally(() => {
        this.inFlight.delete(turnId);
      });
    this.inFlight.set(turnId, request);
    return request;
  }

  async stop(turnId: string, options: { signal?: AbortSignal } = {}) {
    if (!this.activities.has(turnId)) {
      throw new Error(`OpenCode turn ${turnId} is not active`);
    }
    const status = await this.transport.stop(turnId, options);
    await this.applyStatus(status);
    return status;
  }

  setRealtimeHealthy(turnId: string, healthy: boolean): void {
    if (!this.activities.has(turnId)) return;
    if (healthy) this.realtimeHealthy.add(turnId);
    else this.realtimeHealthy.delete(turnId);
    this.schedule(turnId, healthy ? this.pollIntervalMs * 5 : this.pollIntervalMs);
  }

  dispose(): void {
    this.disposed = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.listeners.clear();
  }

  private async applyStatus(status: OpencodeTurnStatusResult): Promise<void> {
    try {
      await this.onStatus?.(status);
    } catch (error) {
      console.warn("OpenCode status projection callback failed", error);
    }
    if (ACTIVE_STATUSES.has(status.status)) {
      this.setActivity({
        conversationId: status.conversationId,
        turnId: status.turnId,
        status: status.status,
        cancelRequested: status.cancelRequested,
        lastActivityAt: status.lastActivityAt,
      });
      this.schedule(
        status.turnId,
        this.realtimeHealthy.has(status.turnId) ? this.pollIntervalMs * 5 : this.pollIntervalMs,
      );
      return;
    }

    this.removeActivity(status.turnId);
    if (!this.terminalNotified.has(status.turnId)) {
      this.terminalNotified.add(status.turnId);
      try {
        await this.onTerminal?.(status);
      } catch (error) {
        console.warn("OpenCode terminal projection callback failed", error);
      }
    }
  }

  private setActivity(activity: OpencodeTurnActivity): void {
    const previousTurnId = this.conversationTurns.get(activity.conversationId);
    if (previousTurnId && previousTurnId !== activity.turnId) {
      this.removeActivity(previousTurnId);
    }
    this.activities.set(activity.turnId, activity);
    this.conversationTurns.set(activity.conversationId, activity.turnId);
    this.emit();
  }

  private removeActivity(turnId: string): void {
    const activity = this.activities.get(turnId);
    if (activity && this.conversationTurns.get(activity.conversationId) === turnId) {
      this.conversationTurns.delete(activity.conversationId);
    }
    const removed = this.activities.delete(turnId);
    this.clearTimer(turnId);
    this.failures.delete(turnId);
    this.realtimeHealthy.delete(turnId);
    this.pendingAccepts.delete(turnId);
    if (removed) this.emit();
  }

  private scheduleRetry(turnId: string): void {
    const failureCount = (this.failures.get(turnId) ?? 0) + 1;
    this.failures.set(turnId, failureCount);
    const delay = Math.min(this.retryBaseMs * 2 ** (failureCount - 1), this.retryMaxMs);
    this.schedule(turnId, delay);
  }

  private schedule(turnId: string, delay: number): void {
    if (this.disposed || !this.activities.has(turnId)) return;
    this.clearTimer(turnId);
    this.timers.set(
      turnId,
      setTimeout(() => {
        this.timers.delete(turnId);
        void this.pollNow(turnId);
      }, delay),
    );
  }

  private clearTimer(turnId: string): void {
    const timer = this.timers.get(turnId);
    if (timer) clearTimeout(timer);
    this.timers.delete(turnId);
  }

  private emit(): void {
    this.snapshot = { activities: [...this.activities.values()] };
    for (const listener of this.listeners) listener();
  }

  private isClientRejection(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const directStatus = (error as { status?: unknown }).status;
    const responseStatus = (error as { response?: { status?: unknown } }).response?.status;
    const status = typeof directStatus === "number" ? directStatus : responseStatus;
    return typeof status === "number" && status >= 400 && status < 500;
  }

  private async recoverPendingAcceptance(
    turnId: string,
    options: { signal?: AbortSignal },
  ): Promise<OpencodeTurnStatusResult> {
    const input = this.pendingAccepts.get(turnId);
    if (!input) return this.transport.getStatus(turnId, options);
    try {
      const accepted = await this.transport.accept(input, options);
      const status = await this.transport.getStatus(turnId, options);
      this.pendingAccepts.delete(turnId);
      await this.notifyAccepted(accepted);
      return status;
    } catch (error) {
      if (this.isClientRejection(error)) {
        this.removeActivity(turnId);
      }
      throw error;
    }
  }

  private async notifyAccepted(turn: AcceptedOpencodeTurn): Promise<void> {
    if (this.acceptedNotified.has(turn.turnId)) return;
    this.acceptedNotified.add(turn.turnId);
    try {
      await this.onAccepted?.(turn);
    } catch (error) {
      console.warn("OpenCode acceptance callback failed", error);
    }
  }
}
