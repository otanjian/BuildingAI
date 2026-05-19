import { useAiProvidersQuery, useChatConfigQuery, type ChatConfig } from "@buildingai/services/web";
import { parseEmbedChatSearchParams } from "@buildingai/web-core";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { AssistantProvider, Chat, useAssistant } from "@/components/ask-assistant-ui";

/** Minimal chat surface for embedding in extension iframes (no app sidebar). */
export default function EmbedChatPage() {
  const [searchParams] = useSearchParams();
  const pendingChatRequest = useMemo(
    () => parseEmbedChatSearchParams(searchParams),
    [searchParams],
  );
  const { data: providers = [] } = useAiProvidersQuery({ supportedModelTypes: "llm" });
  const { data: rawChatConfig } = useChatConfigQuery();
  const chatConfig = rawChatConfig as ChatConfig | undefined;

  const assistant = useAssistant({
    providers,
    suggestions: [],
    pendingChatRequest,
  });

  const welcomeInfo = chatConfig?.welcomeInfo;

  return (
    <div className="bg-background flex h-dvh min-h-0 w-full flex-col">
      <AssistantProvider {...assistant} showMcpToolDetails={chatConfig?.showMcpToolDetails ?? true}>
        <Chat
          title="AI 检查"
          welcomeTitle={welcomeInfo?.title}
          welcomeDescription={welcomeInfo?.description}
          footerText={welcomeInfo?.footer}
        />
      </AssistantProvider>
    </div>
  );
}
