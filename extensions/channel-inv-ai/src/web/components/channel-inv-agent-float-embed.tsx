import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useChannelInvAgentSettings } from "../hooks/use-channel-inv-agent-settings";
import {
    CHI_AGENT_DOCK_WIDTH_MAX,
    CHI_AGENT_DOCK_WIDTH_MIN,
    useChannelInvAgentDockWidth,
} from "../hooks/use-channel-inv-agent-dock-width";

type ChannelInvAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const ChannelInvAgentDockContext = createContext<ChannelInvAgentDockContextValue | null>(null);

function useChannelInvAgentDockContext(): ChannelInvAgentDockContextValue {
    const ctx = useContext(ChannelInvAgentDockContext);
    if (!ctx) {
        throw new Error("ChannelInvAgentDock components must be used within ChannelInvAgentDockProvider");
    }
    return ctx;
}

export function ChannelInvAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useChannelInvAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 CHI 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 CHI 智能体",
                {
                    action: {
                        label: "前往设置",
                        onClick: () => navigate("/settings"),
                    },
                },
            );
            return;
        }
        setOpen((prev) => !prev);
    }, [agentId, agentName, navigate, publishEmbedUrl, publishReady]);

    const value = useMemo(
        () => ({
            agentId: agentId ?? "",
            agentName,
            publishEmbedUrl,
            publishReady,
            ready,
            open,
            setOpen,
            toggle,
        }),
        [agentId, agentName, publishEmbedUrl, publishReady, ready, open, toggle],
    );

    return <ChannelInvAgentDockContext.Provider value={value}>{children}</ChannelInvAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function ChannelInvAgentTopbarToggle() {
    const { agentName, open, toggle } = useChannelInvAgentDockContext();

    return (
        <button
            type="button"
            className={`channel-inv-agent-top-btn${open ? " channel-inv-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="channel-inv-agent-top-toggle"
            onClick={toggle}
        >
            <span className="channel-inv-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function ChannelInvAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useChannelInvAgentDockContext();
    const { width, resizing, onResizePointerDown } = useChannelInvAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="channel-inv-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="channel-inv-agent-dock"
            style={{ width }}
        >
            <div
                className={`channel-inv-agent-dock-resize${resizing ? " channel-inv-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={CHI_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={CHI_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="channel-inv-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="channel-inv-agent-dock-hd">
                <span className="channel-inv-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="channel-inv-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="channel-inv-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="channel-inv-agent-publish-iframe"
            />
        </aside>
    );
}

export function ChannelInvAgentDockPanel() {
    return <ChannelInvAgentDockPanelInner />;
}
