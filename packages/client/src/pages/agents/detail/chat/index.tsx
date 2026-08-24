import {
  listAgentConversationMessages,
  type PublishedAgentDetail,
  useAgentConversationDetailQuery,
  useAgentConversationsQuery,
  useArchiveAgentConversation,
  useCopyAgentFromSquareMutation,
  usePublishedAgentDetailQuery,
  useUpdateAgentConversation,
} from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import type { FormFieldConfig } from "@buildingai/types/ai/agent-config.interface";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { EditorContentRenderer } from "@buildingai/ui/components/editor";
import {
  InfiniteScrollTop,
  InfiniteScrollTopScrollButton,
} from "@buildingai/ui/components/infinite-scroll-top";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import {
  type ImperativePanelHandle,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@buildingai/ui/components/ui/resizable";
import { Separator } from "@buildingai/ui/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@buildingai/ui/components/ui/sheet";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { formatRemainingPowerLabel } from "@buildingai/ui/lib/remaining-power-label";
import { cn } from "@buildingai/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ListIndentDecrease,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  AssistantProvider,
  MessageItem,
  PromptInput,
  type PromptInputHiddenTool,
  StreamingIndicator,
  useAssistantContext,
} from "@/components/ask-assistant-ui";

import { AgentHistoryConversationRow } from "../../_shared/agent-history-conversation-row";
import { ConversationScrollMemory } from "../../_shared/conversation-scroll-memory";
import { getOpencodeConversationStore } from "../../_shared/opencode-conversation-store";
import { OpencodeQuestionCard } from "../../_shared/opencode-question-card";
import { normalizeOpencodePendingQuestion } from "../../_shared/opencode-turn-client";
import { useBackgroundStreamingConversations } from "../../_shared/use-background-streams";
import { VirtualizedConversationList } from "../../_shared/virtualized-conversation-list";
import { OpencodeIframePanel } from "../_components/opencode-iframe-panel";
import { OpencodeWorkspacePanel } from "../_components/opencode-workspace-panel";
import { useAssistantForAgent } from "../_hooks/use-assistant-for-agent";
import { resolveOpencodeEntryRoute } from "../_utils/opencode-entry-route";
import { hasRenderableOpeningStatement } from "../_utils/opening-statement";

type PublishedAgentDetailWithUploadCapability = PublishedAgentDetail & {
  uploadCapability?: {
    supportedUploadTypes: Array<"image" | "video" | "audio" | "file">;
  };
};

type HiddenTools = PromptInputHiddenTool[];
const HIDDEN_TOOLS: HiddenTools = ["mcp", "quickMenu", "generateImage", "search", "exploreApps"];

function formatCount(n?: number): string {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/**
 * Formats token counts for billing display.
 * Examples: 1000 -> 1k, 1500 -> 1.5k.
 */
function formatTokenCount(n?: number): string {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

type AgentChatBillingRule = {
  power: number;
  tokens: number;
};

function ChatHeader({
  avatar,
  name,
  description,
}: {
  avatar?: string | null;
  name?: string | null;
  description?: string | null;
}) {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-3 px-4 pb-4">
      <Avatar className="size-14 shrink-0 rounded-full">
        <AvatarImage src={avatar ?? undefined} alt={name ?? ""} />
        <AvatarFallback className="rounded-full">
          <Bot className="size-6" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-center text-lg font-semibold">{name ?? "智能体"}</h1>
        {description ? (
          <p className="text-muted-foreground max-w-md text-center text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function getSelectOptions(field: FormFieldConfig): Array<{ value: string; label: string }> {
  const opts = field.options;
  if (!opts?.length) return [];
  return opts.map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value ?? o.label, label: o.label },
  );
}

function AgentInfoPanel({
  agent,
  isLoading,
  conversations,
  isLoadingConversations,
  currentConversationId,
  backgroundStreamingConversationIds,
}: {
  agent: PublishedAgentDetail | undefined;
  isLoading: boolean;
  conversations: Array<{
    id: string;
    title: string;
    activeTurn: { turnId: string; status: string } | null;
    metadata?: Record<string, unknown> | null;
  }>;
  isLoadingConversations: boolean;
  currentConversationId?: string;
  backgroundStreamingConversationIds: ReadonlySet<string>;
}) {
  const copyAgentMutation = useCopyAgentFromSquareMutation(agent?.id ?? "");
  const archiveMutation = useArchiveAgentConversation();
  const updateConversationMutation = useUpdateAgentConversation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userPower = useAuthStore((state) => state.auth.userInfo?.power);
  const remainingPowerLabel = formatRemainingPowerLabel(userPower);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const handleArchive = useCallback(
    async (conversationId: string) => {
      if (!agent?.id) return;
      setArchivingId(conversationId);
      try {
        await archiveMutation.mutateAsync({
          agentId: agent.id,
          conversationId,
          archived: true,
        });
      } catch (error) {
        const message =
          (error as { message?: string })?.message ||
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "归档失败，请稍后重试";
        toast.error(message);
      } finally {
        setArchivingId(null);
      }
    },
    [agent?.id, archiveMutation],
  );

  const handleRename = useCallback(
    async (conversationId: string, title: string) => {
      if (!agent?.id) return;
      await updateConversationMutation.mutateAsync({
        agentId: agent.id,
        conversationId,
        title,
      });
    },
    [agent?.id, updateConversationMutation],
  );

  const handleCopyAgent = useCallback(async () => {
    if (!agent?.id) return;
    try {
      const result = await copyAgentMutation.mutateAsync();
      const newId = result?.id;
      toast.success("已复制到我的智能体");
      if (newId) {
        navigate(`/agents/${newId}/configuration`);
      }
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "复制失败";
      toast.error(message);
    }
  }, [agent?.id, copyAgentMutation, navigate]);

  const tags = agent?.tags ?? [];
  const conversationCount = agent?.conversationCount ?? 0;
  const messageCount = agent?.messageCount ?? 0;
  const creatorName = agent?.creator?.nickname ?? "未知用户";
  const canCopyAgent = agent?.allowCopy === true;
  const publishedAgent = agent as
    | (PublishedAgentDetail & {
        chatBillingRule?: AgentChatBillingRule;
      })
    | undefined;
  const chatModelBillingRule =
    publishedAgent?.chatBillingRule ??
    agent?.models?.find((model) => model.role === "chat")?.billingRule;
  const modelConsumptionText =
    !chatModelBillingRule || chatModelBillingRule.power <= 0
      ? "免费"
      : `${chatModelBillingRule.power} 积分 / ${formatTokenCount(chatModelBillingRule.tokens)} tokens`;
  return (
    <div className="flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 py-3 pl-5">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-center">
              <Avatar className="size-16 rounded-lg after:rounded-lg">
                <AvatarImage
                  src={agent?.avatar ?? undefined}
                  alt={agent?.name ?? ""}
                  className="rounded-lg"
                />
                <AvatarFallback className="rounded-lg">
                  <Bot className="size-4" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{agent?.name ?? "智能体"}</h2>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {agent?.description ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-muted-foreground line-clamp-6 text-sm leading-relaxed">
                    {agent.description}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{agent.description}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}

            <div className="flex items-center gap-2">
              <Avatar className="size-6 rounded-full">
                <AvatarImage src={agent?.creator?.avatar ?? undefined} alt={creatorName} />
                <AvatarFallback className="rounded-full text-xs">
                  {creatorName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground text-sm">{creatorName}</span>
            </div>

            <div className="">
              <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                <span>智能体消耗</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
                <span className="text-foreground text-sm font-semibold">
                  {modelConsumptionText}
                </span>
                {remainingPowerLabel ? (
                  <span className="text-muted-foreground tabular-nums">{remainingPowerLabel}</span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <span>
                  <span className="text-foreground text-base font-bold">
                    {formatCount(conversationCount)}
                  </span>{" "}
                  对话
                </span>
                <Separator orientation="vertical" className="bg-muted-foreground/60 h-3" />
                <span>
                  <span className="text-foreground text-base font-bold">
                    {formatCount(messageCount)}
                  </span>{" "}
                  消息
                </span>
              </div>
              {canCopyAgent ? <div className="text-muted-foreground text-sm">免费复制</div> : null}
            </div>

            <div className="flex flex-col gap-2">
              {canCopyAgent ? (
                <div className="w-full">
                  <Button
                    variant="default"
                    className="w-full"
                    type="button"
                    onClick={handleCopyAgent}
                    disabled={copyAgentMutation.isPending}
                  >
                    {copyAgentMutation.isPending ? "复制中..." : "复制到我的智能体"}
                  </Button>
                </div>
              ) : null}
              <div className="w-full">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={() => {
                    if (!agent?.id) return;
                    if (
                      agent.createMode === "opencode" ||
                      agent.durableOpencodeTurnsEnabled === true
                    ) {
                      const conversationId = getOpencodeConversationStore(
                        `detail-agent-${agent.id}`,
                      ).createDraft();
                      navigate(`/agents/${agent.id}/c/${conversationId}`);
                      return;
                    }
                    navigate(`/agents/${agent.id}/chat`);
                  }}
                  disabled={!agent?.id}
                >
                  新对话
                </Button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <button
                type="button"
                className="flex w-full shrink-0 items-center justify-between py-0.5"
                onClick={() => setHistoryCollapsed((prev) => !prev)}
              >
                <span className="text-foreground text-sm font-medium">历史记录</span>
                <ChevronDown
                  className={`size-4 transition-transform ${historyCollapsed ? "-rotate-90" : "rotate-0"}`}
                />
              </button>
              {!historyCollapsed &&
                (isLoadingConversations ? (
                  <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : conversations.length > 0 ? (
                  <div className="mt-2 min-h-0 flex-1 pr-1">
                    <VirtualizedConversationList
                      items={conversations}
                      getKey={(item) => item.id}
                      renderItem={(item) => (
                        <AgentHistoryConversationRow
                          key={item.id}
                          title={item.title}
                          isSelected={currentConversationId === item.id}
                          isGenerating={
                            backgroundStreamingConversationIds.has(item.id) ||
                            Boolean(item.activeTurn) ||
                            item.metadata?.opencodeTurnStatus === "running"
                          }
                          isArchiving={archivingId === item.id}
                          onSelect={() => navigate(`/agents/${agent?.id}/c/${item.id}`)}
                          onIntent={() => {
                            if (!agent?.id) return;
                            const store = getOpencodeConversationStore(`detail-agent-${agent.id}`);
                            if (store.get(item.id).messages.length > 0) return;
                            void queryClient
                              .fetchQuery({
                                queryKey: [
                                  "agents",
                                  "chat",
                                  "messages",
                                  agent.id,
                                  item.id,
                                  { page: 1, pageSize: 50 },
                                ],
                                queryFn: () =>
                                  listAgentConversationMessages(
                                    agent.id,
                                    item.id,
                                    { page: 1, pageSize: 50 },
                                    { silent: true },
                                  ),
                                staleTime: 30_000,
                              })
                              .then((result) => {
                                if (store.get(item.id).messages.length > 0) return;
                                const total = result.total;
                                const messages = result.items
                                  .map((record, index) => {
                                    const base = (record.message ?? {}) as Record<string, unknown>;
                                    return {
                                      ...base,
                                      id: record.id,
                                      role: (base.role ??
                                        record.role) as import("ai").UIMessage["role"],
                                      metadata: {
                                        ...((base.metadata ?? {}) as Record<string, unknown>),
                                        parentId: record.parentId ?? null,
                                        sequence: total - 1 - index,
                                      },
                                    } as import("ai").UIMessage;
                                  })
                                  .sort(
                                    (left, right) =>
                                      Number(
                                        (left.metadata as { sequence?: number })?.sequence ?? 0,
                                      ) -
                                      Number(
                                        (right.metadata as { sequence?: number })?.sequence ?? 0,
                                      ),
                                  );
                                store.setMessages(item.id, messages);
                              })
                              .catch(() => undefined);
                          }}
                          onRename={(title) => handleRename(item.id, title)}
                          onArchive={() => handleArchive(item.id)}
                        />
                      )}
                    />
                  </div>
                ) : (
                  <div className="text-muted-foreground mt-2 text-xs">暂无对话记录</div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChatContent({
  agentAvatar,
  agentName,
  agentDescription,
  formFields,
  formValues,
  onOpenForm,
  openingStatement,
  openingQuestions,
}: {
  agentAvatar?: string | null;
  agentName?: string | null;
  agentDescription?: string | null;
  formFields: FormFieldConfig[];
  formValues: Record<string, string>;
  onOpenForm?: () => void;
  openingStatement?: string | null;
  openingQuestions?: string[] | null;
}) {
  const {
    displayMessages,
    streamingMessageId,
    isLoading,
    status,
    textareaRef,
    composerKey,
    composerDraft,
    onComposerDraftChange,
    scrollMemoryKey,
    scrollMemory,
    onScrollMemoryChange,
    onSend,
    onStop,
    liked,
    disliked,
    onLike,
    onDislike,
    onRegenerate,
    onEditMessage,
    onSwitchBranch,
    addToolApprovalResponse,
    assistantAvatar,
    pendingQuestion,
    replyQuestion,
    rejectQuestion,
  } = useAssistantContext();

  const normalizedOpeningQuestions = useMemo(
    () => (openingQuestions ?? []).map((q) => q.trim()).filter(Boolean),
    [openingQuestions],
  );
  const hasOpeningContent = useMemo(
    () => hasRenderableOpeningStatement(openingStatement),
    [openingStatement],
  );
  const hasOpening = hasOpeningContent || normalizedOpeningQuestions.length > 0;
  const hasForm = formFields.length > 0;
  const requiredFields = formFields.filter((f) => f.required);
  const requiredFilled = requiredFields.every((f) => (formValues[f.name] ?? "").trim() !== "");

  const hasCurrentMessages = displayMessages.length > 0;
  const isFirstSession = !hasCurrentMessages && !isLoading;

  const handleSubmit = useCallback(
    (message: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
      if (hasForm && !requiredFilled && onOpenForm) {
        onOpenForm();
        throw new Error("FORM_REQUIRED");
      }
      const text = message.text?.trim();
      if (text || (message.files && message.files.length > 0)) {
        onSend(text || "", message.files);
      }
    },
    [onSend, hasForm, requiredFilled, onOpenForm],
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col items-center">
      <InfiniteScrollTop
        className="chat-scroll relative flex min-h-0 w-full flex-1 flex-col"
        hideScrollToBottomButton
        forceFullHeight={isFirstSession}
      >
        <ConversationScrollMemory
          memoryKey={scrollMemoryKey}
          value={scrollMemory}
          onChange={onScrollMemoryChange}
        />
        <div
          className={
            isFirstSession
              ? "mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-3 pt-6 pb-3 sm:px-4 sm:pt-8 sm:pb-4"
              : "mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 pt-6 pb-3 sm:px-4 sm:pt-8 sm:pb-4"
          }
        >
          {isLoading && !hasCurrentMessages ? (
            <div className="flex w-full flex-1 items-center justify-center">
              <p className="text-muted-foreground text-sm">加载中...</p>
            </div>
          ) : isFirstSession ? (
            <>
              <ChatHeader avatar={agentAvatar} name={agentName} description={agentDescription} />
              {hasOpening ? (
                <div className="flex w-full gap-3">
                  {assistantAvatar && (
                    <Avatar className="size-8 shrink-0 rounded-full">
                      <AvatarImage src={assistantAvatar} alt={agentName || ""} />
                      <AvatarFallback className="rounded-full">
                        <Bot className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="bg-muted flex min-w-0 flex-col rounded-2xl px-4 py-3">
                    {hasOpeningContent ? (
                      <EditorContentRenderer value={openingStatement ?? ""} />
                    ) : null}
                    {normalizedOpeningQuestions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {normalizedOpeningQuestions.map((q, i) => (
                          <Button
                            key={i}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => onSend(q)}
                          >
                            {q}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {hasCurrentMessages ? (
                displayMessages.map((displayMsg) => (
                  <MessageItem
                    key={displayMsg.id}
                    displayMessage={displayMsg}
                    isStreaming={streamingMessageId === displayMsg.id}
                    liked={liked[displayMsg.id]}
                    disliked={disliked[displayMsg.id]}
                    onLike={onLike}
                    onDislike={onDislike}
                    onRegenerate={onRegenerate}
                    onEditMessage={onEditMessage}
                    onSwitchBranch={onSwitchBranch}
                    addToolApprovalResponse={addToolApprovalResponse}
                  />
                ))
              ) : hasOpening ? (
                <div className="flex w-full gap-3">
                  {assistantAvatar && (
                    <Avatar className="size-8 shrink-0 rounded-full">
                      <AvatarImage src={assistantAvatar} alt={agentName || ""} />
                      <AvatarFallback className="rounded-full">
                        <Bot className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="bg-muted flex min-w-0 flex-col rounded-2xl px-4 py-3">
                    {hasOpeningContent ? (
                      <EditorContentRenderer value={openingStatement ?? ""} />
                    ) : null}
                    {normalizedOpeningQuestions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {normalizedOpeningQuestions.map((q, i) => (
                          <Button
                            key={i}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => onSend(q)}
                          >
                            {q}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className="bg-background sticky bottom-0 z-10">
          <InfiniteScrollTopScrollButton className="-top-12 z-20" />
          <div className="mx-auto w-full max-w-3xl px-3 py-2 sm:px-4 sm:py-3">
            {pendingQuestion && replyQuestion && rejectQuestion ? (
              <OpencodeQuestionCard
                question={pendingQuestion}
                onReply={replyQuestion}
                onReject={rejectQuestion}
              />
            ) : null}
            {status === "submitted" || status === "streaming" ? <StreamingIndicator /> : null}
            <PromptInput
              key={composerKey}
              textareaRef={textareaRef}
              initialInput={composerDraft}
              onTextChange={onComposerDraftChange}
              status={status}
              onSubmit={handleSubmit}
              onStop={onStop}
              hiddenTools={HIDDEN_TOOLS}
            />
          </div>
        </div>
      </InfiniteScrollTop>
    </div>
  );
}

const AgentChatPage = () => {
  const { id, uuid } = useParams<{ id?: string; uuid?: string }>();
  const navigate = useNavigate();
  const agentId = id ?? "";

  const { data: agent, isLoading: isAgentLoading } = usePublishedAgentDetailQuery(agentId, {
    refetchOnWindowFocus: false,
  });

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [initializedDraftConversationId, setInitializedDraftConversationId] = useState<string>();

  const formFields = useMemo(() => {
    const fields = agent?.formFields;
    return (Array.isArray(fields) ? fields : []) as FormFieldConfig[];
  }, [agent?.formFields]);

  const voiceConfig = useMemo(() => agent?.voiceConfig ?? null, [agent?.voiceConfig]);

  const chatAvatarEnabled = Boolean(agent?.chatAvatarEnabled);
  const chatAvatar = agent?.chatAvatar ?? undefined;
  const agentAvatar = agent?.avatar ?? undefined;

  // Prefer dedicated chat avatar when enabled; otherwise fall back to agent avatar
  // so header and message bubbles stay consistent.
  const assistantAvatar = chatAvatarEnabled
    ? chatAvatar?.trim()
      ? chatAvatar
      : agentAvatar
    : agentAvatar;

  const formVariables = useMemo(() => {
    if (Object.keys(formValues).length === 0) return undefined;
    return formValues;
  }, [formValues]);

  const chatModelFeatures = useMemo(
    () => agent?.models?.find((model) => model.role === "chat")?.features ?? [],
    [agent?.models],
  );

  const supportedUploadTypes = useMemo(
    () =>
      (agent as PublishedAgentDetailWithUploadCapability | undefined)?.uploadCapability
        ?.supportedUploadTypes,
    [agent],
  );

  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useAgentConversationsQuery(
    agentId || undefined,
    { page: 1, pageSize: 30, sortBy: "createdAt" },
    { enabled: !!agentId },
  );
  const isLocalOpenCodeDraft = Boolean(
    uuid && getOpencodeConversationStore(`detail-agent-${agentId}`).isLocalDraft(uuid),
  );
  const isPendingOpenCodeDraft = Boolean(
    isLocalOpenCodeDraft && initializedDraftConversationId !== uuid,
  );
  const { data: conversationDetail } = useAgentConversationDetailQuery(agentId || undefined, uuid, {
    enabled: Boolean(agentId && uuid && !isPendingOpenCodeDraft),
  });

  const activeOpencodeTurn = useMemo(
    () =>
      conversationDetail?.activeTurn ??
      conversationsData?.items?.find((item) => item.id === uuid)?.activeTurn ??
      null,
    [conversationDetail?.activeTurn, conversationsData?.items, uuid],
  );
  const isOpencodeTurnRunning = Boolean(activeOpencodeTurn);
  const durableOpencodeTurnsEnabled =
    agent?.durableOpencodeTurnsEnabled === true || Boolean(activeOpencodeTurn);
  const legacyOpencodeTurnRunning =
    conversationsData?.items?.some(
      (item) => item.id === uuid && item.metadata?.opencodeTurnStatus === "running",
    ) ?? false;

  const assistantResult = useAssistantForAgent({
    agentId,
    agentName: agent?.name ?? "Agent",
    modelFeatures: chatModelFeatures,
    saveConversation: true,
    formVariables,
    suggestions: [],
    thinkingSupported: Boolean(agent?.modelConfig),
    voiceConfig,
    showConversationContext: false,
    showReference: agent?.showReference ?? true,
    assistantAvatar,
    conversationId: uuid,
    isLocalConversationDraft: isPendingOpenCodeDraft,
    isOpencodeTurnRunning: durableOpencodeTurnsEnabled
      ? isOpencodeTurnRunning
      : legacyOpencodeTurnRunning,
    durableOpencodeTurnsEnabled,
    activeOpencodeTurn,
    legacyPendingQuestion: normalizeOpencodePendingQuestion(
      conversationDetail?.metadata?.opencodePendingQuestion,
    ),
    supportedUploadTypes,
  });

  const { ...contextValue } = assistantResult;
  const conversations = useMemo(
    () =>
      (conversationsData?.items ?? [])
        .filter((item) => {
          const meta = (item as any)?.metadata as { isDebug?: boolean } | null | undefined;
          return meta?.isDebug !== true;
        })
        .map((item) => ({
          id: item.id,
          title: item.title?.trim() || "新对话",
          activeTurn: item.activeTurn,
          metadata: item.metadata,
        })),
    [conversationsData?.items],
  );

  const backgroundStreamingConversationIds = useBackgroundStreamingConversations();

  const handleFormValueChange = useCallback((name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const [formPopoverOpen, setFormPopoverOpen] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspacePanelRef = useRef<ImperativePanelHandle>(null);
  const opencodeEntryResolvedRef = useRef<string | null>(null);
  const hasForm = formFields.length > 0;
  const isOpencodeAgent = agent?.createMode === "opencode";

  useEffect(() => {
    if (!isOpencodeAgent) return;
    const panel = workspacePanelRef.current;
    if (!panel) return;
    if (workspaceOpen) {
      if (panel.isCollapsed()) panel.expand();
    } else if (!panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isOpencodeAgent, workspaceOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const collapseOnNarrowScreen = () => {
      if (media.matches) setWorkspaceOpen(false);
    };
    collapseOnNarrowScreen();
    media.addEventListener("change", collapseOnNarrowScreen);
    return () => media.removeEventListener("change", collapseOnNarrowScreen);
  }, []);

  const opencodeEntryDecision = resolveOpencodeEntryRoute({
    agentId,
    isOpencodeAgent,
    conversationId: uuid,
    historyStatus: isConversationsError ? "error" : isLoadingConversations ? "loading" : "success",
    conversations: (conversationsData?.items ?? []).filter(
      (item) => item.metadata?.isDebug !== true,
    ),
  });

  useEffect(() => {
    if (opencodeEntryDecision.kind === "stay") {
      if (uuid) opencodeEntryResolvedRef.current = null;
      return;
    }
    if (
      opencodeEntryDecision.kind === "wait" ||
      opencodeEntryDecision.kind === "error" ||
      opencodeEntryResolvedRef.current === agentId
    ) {
      return;
    }

    opencodeEntryResolvedRef.current = agentId;
    const conversationId =
      opencodeEntryDecision.kind === "open"
        ? opencodeEntryDecision.conversationId
        : getOpencodeConversationStore(`detail-agent-${agentId}`).createDraft();
    navigate(`/agents/${agentId}/c/${conversationId}`, { replace: true });
  }, [agentId, navigate, opencodeEntryDecision, uuid]);

  /**
   * Auto-open the form variables popover when any form fields exist,
   * so users see the form as soon as the chat page loads.
   */
  useEffect(() => {
    if (formFields.length === 0) return;
    setFormPopoverOpen(true);
  }, [formFields.length]);

  return (
    <>
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <div
          className={cn(
            "flex h-dvh w-full",
            "md:gap-0",
            panelExpanded ? "md:bg-muted md:py-2 md:pr-2" : "bg-background",
          )}
        >
          {panelExpanded && (
            <aside className="hidden md:flex">
              <AgentInfoPanel
                agent={agent}
                isLoading={isAgentLoading}
                conversations={conversations}
                isLoadingConversations={isLoadingConversations}
                currentConversationId={uuid}
                backgroundStreamingConversationIds={backgroundStreamingConversationIds}
              />
            </aside>
          )}
          {isOpencodeAgent ? (
            agentId ? (
              <ResizablePanelGroup direction="horizontal" className="min-h-0 min-w-0 flex-1">
                <ResizablePanel defaultSize={100} minSize={42}>
                  <OpencodeIframePanel
                    agentId={agentId}
                    conversationId={uuid}
                    onConversationReady={(conversationId) => {
                      const store = getOpencodeConversationStore(`detail-agent-${agentId}`);
                      if (store.isLocalDraft(conversationId)) {
                        store.markPersisted(conversationId);
                        setInitializedDraftConversationId(conversationId);
                      }
                    }}
                    agentAvatar={agent?.avatar}
                    agentName={agent?.name}
                    panelExpanded={panelExpanded}
                    onTogglePanel={() => setPanelExpanded((v) => !v)}
                    onBack={() => navigate("/agents")}
                    className={cn("min-w-0 flex-1", panelExpanded && "md:rounded-sm")}
                    emptyState={
                      opencodeEntryDecision.kind === "error" ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                          <p className="text-muted-foreground max-w-sm text-sm">
                            无法加载历史会话，请重试。当前不会新建会话。
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void refetchConversations()}
                          >
                            <RefreshCw className="mr-1.5 size-3.5" /> 重试
                          </Button>
                        </div>
                      ) : undefined
                    }
                    headerActions={
                      <>
                        {hasForm && (
                          <Popover open={formPopoverOpen} onOpenChange={setFormPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button size="icon" variant="ghost" title="表单变量">
                                <Settings2 className="size-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                              <div className="space-y-3">
                                <h4 className="text-sm font-medium">表单变量</h4>
                                <p className="text-muted-foreground text-xs">
                                  填写表单变量后，对话中的 {"{{变量}}"} 将被替换为实际值
                                </p>
                                <Separator />
                                {formFields.map((field) => (
                                  <div key={field.name} className="space-y-1.5">
                                    <Label className="text-xs">
                                      {field.label}
                                      {field.required ? (
                                        <span className="text-destructive ml-0.5">*</span>
                                      ) : null}
                                    </Label>
                                    {field.type === "textarea" ? (
                                      <Textarea
                                        placeholder={`输入 ${field.label}`}
                                        value={formValues[field.name] ?? ""}
                                        onChange={(e) =>
                                          handleFormValueChange(field.name, e.target.value)
                                        }
                                        rows={2}
                                        className="resize-none text-xs"
                                      />
                                    ) : field.type === "select" ? (
                                      <select
                                        className="border-input bg-background flex h-8 w-full rounded-md border px-2 text-xs"
                                        value={formValues[field.name] ?? ""}
                                        onChange={(e) =>
                                          handleFormValueChange(field.name, e.target.value)
                                        }
                                      >
                                        <option value="">请选择</option>
                                        {getSelectOptions(field).map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <Input
                                        placeholder={`输入 ${field.label}`}
                                        value={formValues[field.name] ?? ""}
                                        onChange={(e) =>
                                          handleFormValueChange(field.name, e.target.value)
                                        }
                                        className="h-8 text-xs"
                                        maxLength={field.maxLength}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="hidden md:inline-flex"
                          title={workspaceOpen ? "收起工作区" : "打开工作区"}
                          aria-label={workspaceOpen ? "收起项目文件" : "打开项目文件"}
                          aria-pressed={workspaceOpen}
                          onClick={() => setWorkspaceOpen((open) => !open)}
                        >
                          <PanelRight className="size-4" />
                        </Button>
                      </>
                    }
                  />
                </ResizablePanel>
                <ResizableHandle withHandle={workspaceOpen} className="hidden md:flex" />
                <ResizablePanel
                  ref={workspacePanelRef}
                  collapsible
                  collapsedSize={0}
                  defaultSize={0}
                  minSize={20}
                  maxSize={55}
                  onCollapse={() => setWorkspaceOpen(false)}
                  onExpand={() => setWorkspaceOpen(true)}
                  className="hidden md:block"
                >
                  <OpencodeWorkspacePanel agentId={agentId} className="border-border border-l" />
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : null
          ) : (
            <div
              className={cn(
                "bg-background relative flex min-w-0 flex-1 flex-col overflow-hidden",
                panelExpanded && "md:rounded-sm",
              )}
            >
              <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 pt-3">
                <div className="flex items-center gap-1">
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 md:hidden"
                      aria-label="打开菜单"
                    >
                      <PanelLeft className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hidden md:inline-flex"
                    title={panelExpanded ? "收起侧栏" : "展开侧栏"}
                    onClick={() => setPanelExpanded((v) => !v)}
                  >
                    {panelExpanded ? (
                      <ListIndentDecrease className="size-4" />
                    ) : (
                      <ListIndentDecrease className="size-4 rotate-180" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => navigate("/agents")}>
                    <ChevronLeft />
                  </Button>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8 rounded-lg after:rounded-lg">
                      <AvatarImage
                        className="rounded-lg"
                        src={agent?.avatar ?? undefined}
                        alt={agent?.name ?? ""}
                      />
                      <AvatarFallback className="rounded-lg">
                        <Bot className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className={panelExpanded ? "md:opacity-0" : "opacity-100 transition"}>
                      {agent?.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {hasForm && (
                    <Popover open={formPopoverOpen} onOpenChange={setFormPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button size="icon" variant="ghost" title="表单变量">
                          <Settings2 className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium">表单变量</h4>
                          <p className="text-muted-foreground text-xs">
                            填写表单变量后，对话中的 {"{{变量}}"} 将被替换为实际值
                          </p>
                          <Separator />
                          {formFields.map((field) => (
                            <div key={field.name} className="space-y-1.5">
                              <Label className="text-xs">
                                {field.label}
                                {field.required ? (
                                  <span className="text-destructive ml-0.5">*</span>
                                ) : null}
                              </Label>
                              {field.type === "textarea" ? (
                                <Textarea
                                  placeholder={`输入 ${field.label}`}
                                  value={formValues[field.name] ?? ""}
                                  onChange={(e) =>
                                    handleFormValueChange(field.name, e.target.value)
                                  }
                                  rows={2}
                                  className="resize-none text-xs"
                                />
                              ) : field.type === "select" ? (
                                <select
                                  className="border-input bg-background flex h-8 w-full rounded-md border px-2 text-xs"
                                  value={formValues[field.name] ?? ""}
                                  onChange={(e) =>
                                    handleFormValueChange(field.name, e.target.value)
                                  }
                                >
                                  <option value="">请选择</option>
                                  {getSelectOptions(field).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <Input
                                  placeholder={`输入 ${field.label}`}
                                  value={formValues[field.name] ?? ""}
                                  onChange={(e) =>
                                    handleFormValueChange(field.name, e.target.value)
                                  }
                                  className="h-8 text-xs"
                                  maxLength={field.maxLength}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </header>
              <AssistantProvider {...contextValue}>
                <ChatContent
                  agentAvatar={agentAvatar}
                  agentName={agent?.name}
                  formFields={formFields}
                  formValues={formValues}
                  onOpenForm={() => setFormPopoverOpen(true)}
                  openingStatement={agent?.openingStatement}
                  openingQuestions={agent?.openingQuestions ?? []}
                />
              </AssistantProvider>
            </div>
          )}
          <SheetContent
            side="left"
            className="bg-sidebar flex h-full w-[min(20rem,calc(100vw-1rem))] max-w-[min(20rem,calc(100vw-1rem))] flex-col gap-0 border-r p-0 sm:max-w-sm"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>智能体信息</SheetTitle>
              <SheetDescription>智能体详情与历史对话</SheetDescription>
            </SheetHeader>
            <div className="chat-scroll flex min-h-0 flex-1 flex-col overflow-hidden py-2">
              <div className="w-full min-w-0 [&>div]:w-full [&>div]:max-w-full">
                <AgentInfoPanel
                  agent={agent}
                  isLoading={isAgentLoading}
                  conversations={conversations}
                  isLoadingConversations={isLoadingConversations}
                  currentConversationId={uuid}
                  backgroundStreamingConversationIds={backgroundStreamingConversationIds}
                />
              </div>
            </div>
          </SheetContent>
        </div>
      </Sheet>
    </>
  );
};

export default AgentChatPage;
