import { validate as isUUID } from "uuid";

/** Must not match `/chat/:id` (which would treat `embed` as a conversation id). */
export const EMBED_CHAT_PATH = "/embed/chat";

export function isEmbedChatPath(pathname: string): boolean {
  return pathname === EMBED_CHAT_PATH || pathname.endsWith(EMBED_CHAT_PATH);
}

/** App extension shell with right-side embedded chat (`/apps/:identifier/...`). */
export function isAppsEmbeddedChatPath(pathname: string): boolean {
  return /^\/apps\/[^/]+/.test(pathname);
}

function conversationIdFromSearch(searchConversationId?: string | null): string | undefined {
  const embeddedId = searchConversationId?.trim();
  return embeddedId && isUUID(embeddedId) ? embeddedId : undefined;
}

export function resolveChatThreadId(
  pathname: string,
  routeId?: string,
  searchConversationId?: string | null,
): string | undefined {
  if (isEmbedChatPath(pathname) || isAppsEmbeddedChatPath(pathname)) {
    return conversationIdFromSearch(searchConversationId);
  }

  const id = routeId?.trim();
  return id && isUUID(id) ? id : undefined;
}
