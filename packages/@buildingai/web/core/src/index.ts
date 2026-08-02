export { defineRouteOption, type RouteOption } from "./defineRouteOption";
export {
    buildEmbedChatSearchParams,
    buildInspectionRulePrompt,
    clearPendingChatRequest,
    consumePendingChatRequest,
    EXTENSION_OPEN_CHAT_MESSAGE_TYPE,
    EXTENSION_SHOW_CHAT_PANEL_MESSAGE_TYPE,
    type ExtensionOpenChatMessage,
    type ExtensionShowChatPanelMessage,
    type InspectionRulePayload,
    isExtensionOpenChatMessage,
    isExtensionShowChatPanelMessage,
    openPlatformChat,
    parseEmbedChatSearchParams,
    peekPendingChatRequest,
    type PendingChatRequest,
    PLATFORM_EMBED_CHAT_PATH,
    resolveInspectionPromptQueue,
    savePendingChatRequest,
    showPlatformChatPanel,
} from "./platform-chat";
export type { ExtensionMenuItem } from "@buildingai/ui/layouts/extension/console/types";
