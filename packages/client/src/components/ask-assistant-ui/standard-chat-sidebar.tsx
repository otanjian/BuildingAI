import {
  type ChatConfig,
  useAiProvidersQuery,
  useChatConfigQuery,
} from "@buildingai/services/web";
import type { PendingChatRequest } from "@buildingai/web-core";
import { Button } from "@buildingai/ui/components/ui/button";
import { XIcon } from "lucide-react";
import { useMemo } from "react";

import { AssistantProvider } from "./context";
import { Chat } from "./chat";
import { useAssistant } from "./hooks/use-assistant";

export type StandardChatSidebarProps = {
  request?: PendingChatRequest | null;
  title?: string;
  onClose?: () => void;
};

export function StandardChatSidebar({ request, title = "AI 检查", onClose }: StandardChatSidebarProps) {
  const { data: providers = [] } = useAiProvidersQuery({ supportedModelTypes: "llm" });
  const { data: rawChatConfig } = useChatConfigQuery();
  const chatConfig = rawChatConfig as ChatConfig | undefined;

  const welcomeInfo = chatConfig?.welcomeInfo;

  const assistant = useAssistant({
    providers,
    suggestions: [],
    pendingChatRequest: request ?? undefined,
  });

  const panelTitle = useMemo(() => title, [title]);

  return (
    <aside className="bg-background flex h-full w-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="truncate text-sm font-semibold">{panelTitle}</h2>
        {onClose ? (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="关闭">
            <XIcon className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
        <AssistantProvider {...assistant} showMcpToolDetails={chatConfig?.showMcpToolDetails ?? true}>
          <Chat
            title={panelTitle}
            welcomeTitle={welcomeInfo?.title}
            welcomeDescription={welcomeInfo?.description}
            footerText={welcomeInfo?.footer}
          />
        </AssistantProvider>
      </div>
    </aside>
  );
}
