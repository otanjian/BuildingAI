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

import { useEhcsAgentSettings } from "../hooks/use-ehcs-agent-settings";
import {
    EHCS_AGENT_DOCK_WIDTH_MAX,
    EHCS_AGENT_DOCK_WIDTH_MIN,
    useEhcsAgentDockWidth,
} from "../hooks/use-ehcs-agent-dock-width";

type EhcsAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const EhcsAgentDockContext = createContext<EhcsAgentDockContextValue | null>(null);

function useEhcsAgentDockContext(): EhcsAgentDockContextValue {
    const ctx = useContext(EhcsAgentDockContext);
    if (!ctx) {
        throw new Error("EhcsAgentDock components must be used within EhcsAgentDockProvider");
    }
    return ctx;
}

export function EhcsAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useEhcsAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 EHCS 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 EHCS 智能体",
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

    return <EhcsAgentDockContext.Provider value={value}>{children}</EhcsAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function EhcsAgentTopbarToggle() {
    const { agentName, open, toggle } = useEhcsAgentDockContext();

    return (
        <button
            type="button"
            className={`ehcs-agent-top-btn${open ? " ehcs-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="ehcs-agent-top-toggle"
            onClick={toggle}
        >
            <span className="ehcs-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function EhcsAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useEhcsAgentDockContext();
    const { width, resizing, onResizePointerDown } = useEhcsAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="ehcs-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="ehcs-agent-dock"
            style={{ width }}
        >
            <div
                className={`ehcs-agent-dock-resize${resizing ? " ehcs-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={EHCS_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={EHCS_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="ehcs-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="ehcs-agent-dock-hd">
                <span className="ehcs-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="ehcs-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="ehcs-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="ehcs-agent-publish-iframe"
            />
        </aside>
    );
}

export function EhcsAgentDockPanel() {
    return <EhcsAgentDockPanelInner />;
}
