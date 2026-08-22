import { useAgentOpencodeSessionMessagesQuery } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { Button } from "@buildingai/ui/components/ui/button";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { cn } from "@buildingai/ui/lib/utils";
import type { UIMessage } from "ai";
import { Loader2, MessageSquare, RefreshCw, TerminalSquare } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MessageComponent, PromptInput, useAssistantContext } from "@/components/ask-assistant-ui";
import { getApiBaseUrl } from "@/utils/api";

import { subscribeOpencodeSessionEvents } from "../../_shared/opencode-events";
import type { OpencodeSessionMessage } from "../../_shared/opencode-live-preview";
import {
  mapOpencodeSessionMessages,
  mergeOpencodeSessionMessages,
} from "../../_shared/opencode-native-panel-mapper";
import { OpencodeQuestionCard } from "../../_shared/opencode-question-card";
import { OpencodeWorkspacePanel } from "./opencode-workspace-panel";

type OpencodeNativePanelProps = {
  agentId: string;
  conversationId?: string;
  isLocalDraft?: boolean;
  isTurnRunning?: boolean;
  className?: string;
};

function PanelMessage({
  message,
  isLast,
  isRunning,
}: {
  message: UIMessage;
  isLast: boolean;
  isRunning: boolean;
}) {
  return (
    <MessageComponent
      message={message}
      isLast={isLast}
      isStreaming={Boolean(
        message.role === "assistant" &&
        isRunning &&
        (message.metadata as { opencodeFinish?: string | null })?.opencodeFinish == null &&
        isLast,
      )}
      showConversationContext={false}
    />
  );
}

export function OpencodeNativePanel({
  agentId,
  conversationId,
  isLocalDraft = false,
  isTurnRunning = false,
  className,
}: OpencodeNativePanelProps) {
  const {
    displayMessages,
    status,
    onSend,
    onStop,
    composerKey,
    composerDraft,
    onComposerDraftChange,
    pendingQuestion,
    replyQuestion,
    rejectQuestion,
  } = useAssistantContext();
  const token = useAuthStore((state) => state.auth.token);
  const isRunning = isTurnRunning || status === "submitted" || status === "streaming";
  const messagesQuery = useAgentOpencodeSessionMessagesQuery(agentId, conversationId, {
    enabled: Boolean(conversationId) && !isLocalDraft,
    refetchInterval: isRunning ? 1500 : false,
  });
  const [sessionMessages, setSessionMessages] = useState<OpencodeSessionMessage[]>([]);
  const [activeTab, setActiveTab] = useState("chat");
  const [streamError, setStreamError] = useState<string | null>(null);
  const panelInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSessionMessages([]);
    setStreamError(null);
  }, [conversationId]);

  useEffect(() => {
    if (messagesQuery.data?.messages) {
      setSessionMessages((current) =>
        mergeOpencodeSessionMessages(current, messagesQuery.data?.messages ?? []),
      );
    }
  }, [messagesQuery.data?.messages]);

  useEffect(() => {
    if (!conversationId || isLocalDraft || !isRunning || !token) return;
    const controller = new AbortController();
    setStreamError(null);
    void subscribeOpencodeSessionEvents({
      url: `${getApiBaseUrl()}/api/ai-agents/${agentId}/chat/conversations/${conversationId}/opencode-session/events`,
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      onSnapshot: (snapshot) => {
        setSessionMessages((current) => mergeOpencodeSessionMessages(current, snapshot));
      },
      onDone: () => {
        void messagesQuery.refetch();
      },
      onError: (error) => setStreamError(error.message),
    });
    return () => controller.abort();
  }, [agentId, conversationId, isLocalDraft, isRunning, messagesQuery.refetch, token]);

  const apiMessages = useMemo(() => mapOpencodeSessionMessages(sessionMessages), [sessionMessages]);
  const fallbackMessages = useMemo(
    () => (displayMessages.length ? displayMessages.map((item) => item.message) : []),
    [displayMessages],
  );
  const renderedMessages = apiMessages.length ? apiMessages : fallbackMessages;

  const handleSubmit = useCallback(
    (message: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
      const text = message.text?.trim();
      if (text || message.files?.length) onSend(text ?? "", message.files);
    },
    [onSend],
  );

  return (
    <aside className={cn("bg-background flex h-full min-h-0 w-full flex-col", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="border-border flex h-10 shrink-0 items-center border-b px-2">
          <TabsList variant="line" className="h-full">
            <TabsTrigger value="chat" className="gap-1.5 px-3 text-xs">
              <MessageSquare className="size-3.5" /> 对话
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5 px-3 text-xs">
              <TerminalSquare className="size-3.5" /> 文件
            </TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-1">
            {streamError ? (
              <span className="text-destructive max-w-28 truncate text-[10px]">同步失败</span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="刷新 OpenCode 会话"
              onClick={() => void messagesQuery.refetch()}
              disabled={messagesQuery.isFetching}
            >
              {messagesQuery.isFetching ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
            </Button>
          </div>
        </div>
        <TabsContent
          value="chat"
          className="m-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 px-3 py-4">
              {messagesQuery.isLoading && renderedMessages.length === 0 ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-xs">
                  <Loader2 className="size-3 animate-spin" /> 正在加载 OpenCode 会话…
                </div>
              ) : renderedMessages.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-12 text-center text-xs">
                  <MessageSquare className="size-5" />
                  <span>发送消息后，这里会显示 OpenCode 的任务进展</span>
                </div>
              ) : (
                renderedMessages.map((message, index) => (
                  <PanelMessage
                    key={message.id}
                    message={message}
                    isLast={index === renderedMessages.length - 1}
                    isRunning={isRunning}
                  />
                ))
              )}
            </div>
          </ScrollArea>
          <div className="border-border shrink-0 border-t p-2">
            {pendingQuestion && replyQuestion && rejectQuestion ? (
              <OpencodeQuestionCard
                question={pendingQuestion}
                onReply={replyQuestion}
                onReject={rejectQuestion}
              />
            ) : null}
            {isRunning ? (
              <div className="text-muted-foreground mb-1 px-1 text-[11px]">OpenCode 正在处理…</div>
            ) : null}
            <PromptInput
              key={composerKey}
              textareaRef={panelInputRef}
              initialInput={composerDraft}
              onTextChange={onComposerDraftChange}
              status={status}
              onSubmit={handleSubmit}
              onStop={onStop}
              hiddenTools={["mcp", "quickMenu", "generateImage", "search", "exploreApps"]}
            />
          </div>
        </TabsContent>
        <TabsContent value="files" className="m-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <OpencodeWorkspacePanel agentId={agentId} className="border-0" />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
