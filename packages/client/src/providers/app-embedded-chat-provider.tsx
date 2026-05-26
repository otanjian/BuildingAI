import { Button } from "@buildingai/ui/components/ui/button";
import {
  clearPendingChatRequest,
  EXTENSION_SHOW_CHAT_PANEL_MESSAGE_TYPE,
  isExtensionOpenChatMessage,
  isExtensionShowChatPanelMessage,
  peekPendingChatRequest,
  resolveInspectionPromptQueue,
  savePendingChatRequest,
  type ExtensionOpenChatMessage,
  type PendingChatRequest,
} from "@buildingai/web-core";
import { Bot } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { StandardChatSidebar } from "@/components/ask-assistant-ui/standard-chat-sidebar";
import { appUsesInternalAgentDock } from "@/lib/extension-internal-agent-apps";

function pendingRequestFromExtensionMessage(message: ExtensionOpenChatMessage): PendingChatRequest {
  const draft: PendingChatRequest = {
    prompt: message.prompt,
    promptQueue: message.promptQueue,
    inspectionRules: message.inspectionRules,
    initialDelayMs: message.initialDelayMs,
    modelId: message.modelId,
    mcpServerIds: message.mcpServerIds,
  };
  const queue = resolveInspectionPromptQueue(draft);
  if (queue.length === 0) {
    return draft;
  }
  return {
    ...draft,
    prompt: queue[0]!,
    promptQueue: queue,
  };
}

export function AppEmbeddedChatProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [request, setRequest] = useState<PendingChatRequest | null>(() => peekPendingChatRequest());
  const [requestNonce, setRequestNonce] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    setPanelMounted(true);
  }, []);

  /** Open sidebar for manual chat only — do not resume a pending inspection prompt queue. */
  const openEmptyPanel = useCallback(() => {
    clearPendingChatRequest();
    setRequest(null);
    setRequestNonce(Date.now());
    openPanel();
  }, [openPanel]);

  const applyRequest = useCallback(
    (next: PendingChatRequest) => {
      savePendingChatRequest(next);
      setRequest(next);
      setRequestNonce(Date.now());
      const params = new URLSearchParams(location.search);
      params.delete("conversationId");
      const qs = params.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`, { replace: true });
      openPanel();
    },
    [location.hash, location.pathname, location.search, navigate, openPanel],
  );

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setPanelMounted(false);
  }, []);

  const onInternalAgentApp = appUsesInternalAgentDock(location.pathname);

  useEffect(() => {
    if (!onInternalAgentApp) return;
    clearPendingChatRequest();
    setRequest(null);
    setPanelOpen(false);
    setPanelMounted(false);
  }, [onInternalAgentApp]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (onInternalAgentApp) return;
      if (isExtensionOpenChatMessage(event.data)) {
        applyRequest(pendingRequestFromExtensionMessage(event.data));
        return;
      }
      if (isExtensionShowChatPanelMessage(event.data)) {
        openEmptyPanel();
      }
    };

    const handleShowPanelEvent = () => {
      if (onInternalAgentApp) return;
      openEmptyPanel();
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener(EXTENSION_SHOW_CHAT_PANEL_MESSAGE_TYPE, handleShowPanelEvent);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener(EXTENSION_SHOW_CHAT_PANEL_MESSAGE_TYPE, handleShowPanelEvent);
    };
  }, [applyRequest, onInternalAgentApp, openEmptyPanel]);

  const onAppsRoute = location.pathname.startsWith("/apps/");
  const showEmbeddedShellChat = onAppsRoute && !onInternalAgentApp;
  const showPanel = showEmbeddedShellChat && panelOpen && panelMounted;
  const showFab = showEmbeddedShellChat && !showPanel;

  const chatSidebarKey = request
    ? `${requestNonce}:${request.prompt}:${request.promptQueue?.join("\x1e") ?? ""}:${request.initialDelayMs ?? 0}:${request.modelId ?? ""}:${request.mcpServerIds?.join(",") ?? ""}`
    : "manual";

  return (
    <div className="flex h-dvh w-full overflow-hidden" data-testid="app-embedded-chat-layout">
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
      {showPanel ? (
        <aside
          className="bg-background flex h-dvh w-1/3 min-w-[280px] max-w-[480px] shrink-0 grow-0 basis-1/3 flex-col border-l shadow-lg"
          data-testid="app-embedded-chat-panel"
          aria-label="AI 对话"
        >
          <StandardChatSidebar
            key={chatSidebarKey}
            request={request}
            title="AI 对话"
            onClose={closePanel}
          />
        </aside>
      ) : null}
      {showFab ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="fixed top-1/2 right-0 z-30 h-auto -translate-y-1/2 rounded-r-none rounded-l-lg border-r-0 px-2 py-3 shadow-md"
          onClick={openEmptyPanel}
          aria-label="打开 AI 对话"
          data-testid="app-embedded-chat-open"
        >
          <Bot className="size-4" />
          <span className="sr-only">AI 对话</span>
        </Button>
      ) : null}
    </div>
  );
}
