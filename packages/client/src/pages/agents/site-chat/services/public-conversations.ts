import { useQuery } from "@tanstack/react-query";

import { getApiBaseUrl } from "@/utils/api";

import { createPublicHttpClient, fetchPublicJson } from "./public-http";

export type PublicConversation = {
  id: string;
  title: string;
};

export type PublicConversationDetail = {
  id: string;
  title?: string | null;
  archivedAt?: string | null;
};

type PublicConversationListResult = {
  items: Array<{
    id: string;
    title?: string | null;
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

export async function getPublicConversationDetail(args: {
  conversationId: string;
  accessToken: string;
  anonymousIdentifier?: string;
}): Promise<PublicConversationDetail> {
  const url = `${getApiBaseUrl()}/v1/conversations/${args.conversationId}`;
  return fetchPublicJson<PublicConversationDetail>(url, args.accessToken, args.anonymousIdentifier);
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
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: () =>
      getPublicConversations({
        agentId: agentId!,
        accessToken: accessToken!,
        anonymousIdentifier,
      }),
  });
}
