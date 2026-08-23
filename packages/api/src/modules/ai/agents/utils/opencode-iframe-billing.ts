import type { ChatMessageUsage } from "@buildingai/types";
import { createHash } from "node:crypto";

import type { OpencodeSessionMessage } from "../integrations/opencode-api.service";
import { OpencodeTokenUsageAccumulator } from "./opencode-token-usage";

export const OPENCODE_IFRAME_BILLING_METADATA_KEY = "opencodeIframeBilling";

export type OpencodeIframeBillingState = {
    version: 1;
    startedAt: string;
    lastSettledUserMessageId?: string;
    lastSettledUserMessageCreatedAt?: number;
    lastActivityAt?: string;
    lastSettledAt?: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    consumedPower: number;
    settledTurns: number;
};

export type OpencodeIframeSettlementPlan = {
    userMessageId: string;
    userMessageCreatedAt: number;
    lastActivityAt: number;
    usage: ChatMessageUsage;
    associationNo: string;
};

export function initializeOpencodeIframeBillingState(
    current: unknown,
    now = new Date(),
): OpencodeIframeBillingState {
    const existing = readOpencodeIframeBillingState(current);
    if (existing) return existing;
    return {
        version: 1,
        startedAt: now.toISOString(),
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        consumedPower: 0,
        settledTurns: 0,
    };
}

export function readOpencodeIframeBillingState(value: unknown): OpencodeIframeBillingState | null {
    if (!value || typeof value !== "object") return null;
    const state = value as Partial<OpencodeIframeBillingState>;
    if (state.version !== 1 || !isValidDate(state.startedAt)) return null;
    return {
        version: 1,
        startedAt: state.startedAt!,
        ...(typeof state.lastSettledUserMessageId === "string" && state.lastSettledUserMessageId
            ? { lastSettledUserMessageId: state.lastSettledUserMessageId }
            : {}),
        ...(isNonNegativeFinite(state.lastSettledUserMessageCreatedAt)
            ? { lastSettledUserMessageCreatedAt: state.lastSettledUserMessageCreatedAt }
            : {}),
        ...(isValidDate(state.lastActivityAt) ? { lastActivityAt: state.lastActivityAt } : {}),
        ...(isValidDate(state.lastSettledAt) ? { lastSettledAt: state.lastSettledAt } : {}),
        inputTokens: nonNegativeNumber(state.inputTokens),
        outputTokens: nonNegativeNumber(state.outputTokens),
        totalTokens: nonNegativeNumber(state.totalTokens),
        consumedPower: nonNegativeNumber(state.consumedPower),
        settledTurns: nonNegativeNumber(state.settledTurns),
    };
}

export function planOpencodeIframeSettlements(
    messages: OpencodeSessionMessage[],
    state: OpencodeIframeBillingState,
    conversationId = "",
): OpencodeIframeSettlementPlan[] {
    const startedAt = Date.parse(state.startedAt);
    const users = messages
        .filter(
            (message) =>
                message.info?.role === "user" &&
                Boolean(message.info.id) &&
                messageCreatedAt(message) >= startedAt,
        )
        .sort(compareMessages);
    const plans: OpencodeIframeSettlementPlan[] = [];

    for (const user of users) {
        const userMessageId = user.info!.id!;
        const userMessageCreatedAt = messageCreatedAt(user);
        if (!isAfterCursor(userMessageId, userMessageCreatedAt, state)) continue;

        const descendants = messages
            .filter(
                (message) =>
                    message.info?.role === "assistant" &&
                    message.info.parentID === userMessageId &&
                    Boolean(message.info.id),
            )
            .sort(compareMessages);
        const terminal = descendants.some(
            (message) => Boolean(message.info?.finish) || Boolean(message.info?.error),
        );
        if (!terminal) break;

        const usageAccumulator = new OpencodeTokenUsageAccumulator();
        for (const descendant of descendants) {
            usageAccumulator.observeMessageUpdated(descendant.info);
            for (const part of descendant.parts ?? []) {
                usageAccumulator.observeStepFinishPart(part);
            }
        }
        const lastActivityAt = Math.max(
            userMessageCreatedAt,
            ...descendants.map((message) => messageActivityAt(message)),
        );
        plans.push({
            userMessageId,
            userMessageCreatedAt,
            lastActivityAt,
            usage: usageAccumulator.finalize(),
            associationNo: buildOpencodeIframeAssociationNo(conversationId, userMessageId),
        });
    }

    return plans;
}

export function buildOpencodeIframeAssociationNo(
    conversationId: string,
    userMessageId: string,
): string {
    const digest = createHash("sha256")
        .update(`${conversationId}\0${userMessageId}`)
        .digest("hex")
        .slice(0, 40);
    return `opencode-turn:if:${digest}`;
}

function isAfterCursor(
    messageId: string,
    createdAt: number,
    state: OpencodeIframeBillingState,
): boolean {
    if (!state.lastSettledUserMessageId) return true;
    const cursorCreatedAt = state.lastSettledUserMessageCreatedAt;
    if (typeof cursorCreatedAt !== "number") {
        return messageId !== state.lastSettledUserMessageId;
    }
    if (createdAt !== cursorCreatedAt) return createdAt > cursorCreatedAt;
    return messageId > state.lastSettledUserMessageId;
}

function compareMessages(left: OpencodeSessionMessage, right: OpencodeSessionMessage): number {
    return (
        messageCreatedAt(left) - messageCreatedAt(right) ||
        String(left.info?.id ?? "").localeCompare(String(right.info?.id ?? ""))
    );
}

function messageCreatedAt(message: OpencodeSessionMessage): number {
    const value = message.info?.time?.created;
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function messageActivityAt(message: OpencodeSessionMessage): number {
    const values = [
        message.info?.time?.completed,
        message.info?.time?.updated,
        message.info?.time?.created,
    ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return values.length > 0 ? Math.max(...values) : 0;
}

function isValidDate(value: unknown): value is string {
    return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isNonNegativeFinite(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function nonNegativeNumber(value: unknown): number {
    return isNonNegativeFinite(value) ? value : 0;
}
