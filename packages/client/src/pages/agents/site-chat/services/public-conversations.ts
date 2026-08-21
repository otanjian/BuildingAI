import { useQuery } from "@tanstack/react-query";

import { getApiBaseUrl } from "@/utils/api";

import type {
  AcceptedOpencodeTurn,
  OpencodeTurnCommand,
  OpencodeTurnStatusResult,
} from "../../_shared/opencode-turn-client";
import { createPublicHttpClient, fetchPublicJson, unwrapPublicEnvelope } from "./public-http";

export type PublicActiveOpencodeTurn = {
  turnId: string;
  status: "accepted" | "running" | "committing";
  lastActivityAt: string;
  cancelRequested: boolean;
};

export type PublicConversation = {
  id: string;
  title: string;
  activeTurn: PublicActiveOpencodeTurn | null;
  /** Legacy-only display compatibility while durable turns are disabled. */
  opencodeTurnStatus?: string;
};

export type PublicConversationDetail = {
  id: string;
  title?: string | null;
  archivedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  activeTurn: PublicActiveOpencodeTurn | null;
};

type PublicConversationListResult = {
  items: Array<{
    id: string;
    title?: string | null;
    metadata?: Record<string, unknown> | null;
    activeTurn?: PublicActiveOpencodeTurn | null;
  }>;
};

export async function getPublicConversations(args: {
  agentId: string;
  accessToken: string;
  anonymousIdentifier?: string;
}): Promise<PublicConversation[]> {
  const url = `${getApiBaseUrl()}/v1/conversations?page=1&pageSize=30&sortBy=updatedAt`;
  const data = await fetchPublicJson<PublicConversationListResult>(
    url,
    args.accessToken,
    args.anonymousIdentifier,
  );

  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.title?.trim() || "新对话",
    activeTurn: item.activeTurn ?? null,
    opencodeTurnStatus:
      typeof item.metadata?.opencodeTurnStatus === "string"
        ? item.metadata.opencodeTurnStatus
        : undefined,
  }));
}

export async function archivePublicConversation(args: {
  conversationId: string;
  accessToken: string;
  anonymousIdentifier?: string;
  archived: boolean;
}): Promise<void> {
  const url = `${getApiBaseUrl()}/v1/conversations/${args.conversationId}/archive`;
  const client = createPublicHttpClient(args.accessToken, args.anonymousIdentifier);
  await client.patch<void>(url, { archived: args.archived });
}

export async function updatePublicConversationTitle(args: {
  conversationId: string;
  accessToken: string;
  anonymousIdentifier?: string;
  title: string;
}): Promise<void> {
  const url = `${getApiBaseUrl()}/v1/conversations/${args.conversationId}`;
  const client = createPublicHttpClient(args.accessToken, args.anonymousIdentifier);
  await client.patch<void>(url, { title: args.title });
}

export async function stopPublicConversation(args: {
  conversationId: string;
  accessToken: string;
  anonymousIdentifier?: string;
}): Promise<void> {
  const url = `${getApiBaseUrl()}/v1/conversations/${args.conversationId}/stop`;
  const client = createPublicHttpClient(args.accessToken, args.anonymousIdentifier);
  await client.post<void>(url);
}

export async function acceptPublicOpencodeTurn(args: {
  input: OpencodeTurnCommand & { conversationId: string; turnId: string };
  accessToken: string;
  anonymousIdentifier?: string;
  signal?: AbortSignal;
}): Promise<AcceptedOpencodeTurn> {
  const client = createPublicHttpClient(args.accessToken, args.anonymousIdentifier);
  const payload = await client.post<AcceptedOpencodeTurn | { data?: AcceptedOpencodeTurn }>(
    `${getApiBaseUrl()}/v1/opencode-turns`,
    args.input,
    { signal: args.signal },
  );
  return unwrapPublicEnvelope(payload);
}

export async function getPublicOpencodeTurnStatus(args: {
  turnId: string;
  accessToken: string;
  anonymousIdentifier?: string;
  signal?: AbortSignal;
}): Promise<OpencodeTurnStatusResult> {
  const client = createPublicHttpClient(args.accessToken, args.anonymousIdentifier);
  const payload = await client.get<OpencodeTurnStatusResult | { data?: OpencodeTurnStatusResult }>(
    `${getApiBaseUrl()}/v1/opencode-turns/${args.turnId}`,
    { signal: args.signal },
  );
  return unwrapPublicEnvelope(payload);
}

export async function stopPublicOpencodeTurn(args: {
  turnId: string;
  accessToken: string;
  anonymousIdentifier?: string;
  signal?: AbortSignal;
}): Promise<OpencodeTurnStatusResult> {
  const client = createPublicHttpClient(args.accessToken, args.anonymousIdentifier);
  const payload = await client.post<OpencodeTurnStatusResult | { data?: OpencodeTurnStatusResult }>(
    `${getApiBaseUrl()}/v1/opencode-turns/${args.turnId}/stop`,
    undefined,
    { signal: args.signal },
  );
  return unwrapPublicEnvelope(payload);
}

export async function getPublicConversationDetail(args: {
  conversationId: string;
  accessToken: string;
  anonymousIdentifier?: string;
}): Promise<PublicConversationDetail> {
  const url = `${getApiBaseUrl()}/v1/conversations/${args.conversationId}`;
  return fetchPublicJson<PublicConversationDetail>(url, args.accessToken, args.anonymousIdentifier);
}

export function usePublicConversationDetail(args: {
  conversationId?: string;
  accessToken?: string;
  anonymousIdentifier?: string;
}) {
  return useQuery<PublicConversationDetail>({
    queryKey: [
      "public-agent-conversation",
      args.conversationId ?? "",
      args.accessToken ?? "",
      args.anonymousIdentifier ?? "",
    ],
    enabled: Boolean(args.conversationId && args.accessToken),
    queryFn: () =>
      getPublicConversationDetail({
        conversationId: args.conversationId!,
        accessToken: args.accessToken!,
        anonymousIdentifier: args.anonymousIdentifier,
      }),
    refetchInterval: (query) => (query.state.data?.activeTurn ? 4000 : false),
  });
}

import type { OpencodeSessionMessage } from "../../_shared/opencode-live-preview";

export async function getOpencodeSessionMessages(args: {
  agentId: string;
  conversationId: string;
  accessToken: string;
  anonymousIdentifier?: string;
}): Promise<{ sessionId: string | undefined; messages: OpencodeSessionMessage[] }> {
  const url = `${getApiBaseUrl()}/v1/conversations/${args.conversationId}/opencode-session/messages`;
  return fetchPublicJson<{ sessionId: string | undefined; messages: OpencodeSessionMessage[] }>(
    url,
    args.accessToken,
    args.anonymousIdentifier,
  );
}

export function usePublicConversations(
  agentId: string | undefined,
  accessToken: string | undefined,
  anonymousIdentifier?: string,
) {
  return useQuery<PublicConversation[]>({
    queryKey: [
      "public-agent-conversations",
      agentId ?? "",
      accessToken ?? "",
      anonymousIdentifier ?? "",
    ],
    enabled: Boolean(agentId && accessToken),
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      return items.some((c) => c.activeTurn || c.opencodeTurnStatus === "running") ? 4000 : false;
    },
    retry: false,
    queryFn: () =>
      getPublicConversations({
        agentId: agentId!,
        accessToken: accessToken!,
        anonymousIdentifier,
      }),
  });
}
