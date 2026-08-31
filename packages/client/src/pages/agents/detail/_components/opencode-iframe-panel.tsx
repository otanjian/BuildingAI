import { useAgentOpencodeEmbedSessionQuery } from "@buildingai/services/web";
import { useTheme } from "@buildingai/ui/components/theme-provider";
import { Button } from "@buildingai/ui/components/ui/button";
import { cn } from "@buildingai/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  opencodeEmbedRetryDelay,
  opencodeTitleRefetchInterval,
  shouldRefreshOpencodeHistory,
  shouldRefreshOpencodeTitleHistory,
  shouldRetryOpencodeEmbedSession,
} from "../_utils/opencode-embed-bootstrap";
import { resolveOpencodeEmbedColorScheme } from "../_utils/opencode-embed-theme";
import { AgentChatHeader } from "./agent-chat-header";

type OpencodeIframePanelProps = {
  agentId: string;
  conversationId?: string;
  agentAvatar?: string | null;
  agentName?: string | null;
  panelExpanded: boolean;
  onTogglePanel: () => void;
  onBack: () => void;
  onConversationReady?: (conversationId: string) => void;
  headerActions?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
};

export function OpencodeIframePanel({
  agentId,
  conversationId,
  agentAvatar,
  agentName,
  panelExpanded,
  onTogglePanel,
  onBack,
  onConversationReady,
  headerActions,
  emptyState,
  className,
}: OpencodeIframePanelProps) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const lastHistorySessionKeyRef = useRef<string | undefined>(undefined);
  const lastSynchronizedTitleRef = useRef<string | undefined>(undefined);
  const embedQuery = useAgentOpencodeEmbedSessionQuery(agentId, conversationId, {
    enabled: Boolean(agentId && conversationId),
    retry: shouldRetryOpencodeEmbedSession,
    retryDelay: opencodeEmbedRetryDelay,
    refetchInterval: opencodeTitleRefetchInterval,
  });
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const iframeColorScheme = resolveOpencodeEmbedColorScheme(theme, systemPrefersDark);

  const renderFrame = (content: ReactNode) => (
    <div
      className={cn(
        "bg-background relative flex h-full min-h-0 w-full flex-col overflow-hidden",
        className,
      )}
    >
      <AgentChatHeader
        avatar={agentAvatar}
        name={agentName}
        conversationTitle={embedQuery.data?.title}
        panelExpanded={panelExpanded}
        onTogglePanel={onTogglePanel}
        onBack={onBack}
      >
        {headerActions}
      </AgentChatHeader>
      <div className="relative min-h-0 flex-1">{content}</div>
    </div>
  );

  useEffect(() => {
    setIframeLoaded(false);
  }, [conversationId, embedQuery.data?.sessionId]);

  useEffect(() => {
    const sessionKey = embedQuery.data
      ? `${embedQuery.data.conversationId}:${embedQuery.data.sessionId}`
      : undefined;
    if (!shouldRefreshOpencodeHistory(lastHistorySessionKeyRef.current, sessionKey)) return;
    lastHistorySessionKeyRef.current = sessionKey;
    if (embedQuery.data?.conversationId) {
      onConversationReady?.(embedQuery.data.conversationId);
    }
    void queryClient.invalidateQueries({ queryKey: ["agents", "chat", "conversations"] });
  }, [embedQuery.data, onConversationReady, queryClient]);

  useEffect(() => {
    const title = embedQuery.data?.title?.trim();
    const shouldRefresh = shouldRefreshOpencodeTitleHistory(
      lastSynchronizedTitleRef.current,
      title,
      embedQuery.data?.titleSynced === true,
    );
    if (title) lastSynchronizedTitleRef.current = title;
    if (!shouldRefresh) return;
    void queryClient.invalidateQueries({ queryKey: ["agents", "chat", "conversations"] });
  }, [embedQuery.data?.title, embedQuery.data?.titleSynced, queryClient]);

  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemPrefersDark(media.matches);
    updateSystemTheme();
    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, [theme]);

  if (!conversationId) {
    return renderFrame(
      emptyState ?? (
        <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
          正在打开会话…
        </div>
      ),
    );
  }

  if (embedQuery.isPending) {
    return renderFrame(
      <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> 正在加载 OpenCode…
      </div>,
    );
  }

  if (embedQuery.isError || !embedQuery.data?.url) {
    return renderFrame(
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="text-destructive size-5" />
        <p className="text-muted-foreground max-w-sm text-sm">
          OpenCode 当前不可用，会话记录仍保留在 Bowi AI 中。
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void embedQuery.refetch()}>
          <RefreshCw className="mr-1.5 size-3.5" /> 重试
        </Button>
      </div>,
    );
  }

  return renderFrame(
    <>
      {!iframeLoaded ? (
        <div className="text-muted-foreground bg-background absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> 正在新建/打开最新会话...
        </div>
      ) : null}
      <iframe
        key={`${conversationId}:${embedQuery.data.sessionId}`}
        title="OpenCode 会话"
        src={embedQuery.data.url}
        className="h-full w-full border-0"
        style={{ colorScheme: iframeColorScheme }}
        referrerPolicy="no-referrer"
        allow="clipboard-read; clipboard-write"
        onLoad={() => setIframeLoaded(true)}
      />
    </>,
  );
}
