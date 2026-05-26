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

import { useArRiskAgentSettings } from "../hooks/use-ar-risk-agent-settings";
import {
    ARR_AGENT_DOCK_WIDTH_MAX,
    ARR_AGENT_DOCK_WIDTH_MIN,
    useArRiskAgentDockWidth,
} from "../hooks/use-ar-risk-agent-dock-width";

type ArRiskAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const ArRiskAgentDockContext = createContext<ArRiskAgentDockContextValue | null>(null);

function useArRiskAgentDockContext(): ArRiskAgentDockContextValue {
    const ctx = useContext(ArRiskAgentDockContext);
    if (!ctx) {
        throw new Error("ArRiskAgentDock components must be used within ArRiskAgentDockProvider");
    }
    return ctx;
}

export function ArRiskAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useArRiskAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 ARR 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 ARR 智能体",
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

    return <ArRiskAgentDockContext.Provider value={value}>{children}</ArRiskAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function ArRiskAgentTopbarToggle() {
    const { agentName, open, toggle } = useArRiskAgentDockContext();

    return (
        <button
            type="button"
            className={`ar-risk-agent-top-btn${open ? " ar-risk-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="ar-risk-agent-top-toggle"
            onClick={toggle}
        >
            <span className="ar-risk-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function ArRiskAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useArRiskAgentDockContext();
    const { width, resizing, onResizePointerDown } = useArRiskAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="ar-risk-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="ar-risk-agent-dock"
            style={{ width }}
        >
            <div
                className={`ar-risk-agent-dock-resize${resizing ? " ar-risk-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={ARR_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={ARR_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="ar-risk-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="ar-risk-agent-dock-hd">
                <span className="ar-risk-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="ar-risk-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="ar-risk-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="ar-risk-agent-publish-iframe"
            />
        </aside>
    );
}

export function ArRiskAgentDockPanel() {
    return <ArRiskAgentDockPanelInner />;
}
