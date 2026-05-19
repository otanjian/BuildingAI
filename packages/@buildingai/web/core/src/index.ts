export { defineRouteOption, type RouteOption } from "./defineRouteOption";
export type { ExtensionMenuItem } from "@buildingai/ui/layouts/extension/console/types";
export {
    buildEmbedChatSearchParams,
    buildInspectionRulePrompt,
    clearPendingChatRequest,
    consumePendingChatRequest,
    peekPendingChatRequest,
    resolveInspectionPromptQueue,
    EXTENSION_OPEN_CHAT_MESSAGE_TYPE,
    EXTENSION_SHOW_CHAT_PANEL_MESSAGE_TYPE,
    PLATFORM_EMBED_CHAT_PATH,
    isExtensionOpenChatMessage,
    isExtensionShowChatPanelMessage,
    openPlatformChat,
    parseEmbedChatSearchParams,
    savePendingChatRequest,
    showPlatformChatPanel,
    type ExtensionOpenChatMessage,
    type ExtensionShowChatPanelMessage,
    type InspectionRulePayload,
    type PendingChatRequest,
} from "./platform-chat";
