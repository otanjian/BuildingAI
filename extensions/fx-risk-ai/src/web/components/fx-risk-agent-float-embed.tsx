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

import { useFxRiskAgentSettings } from "../hooks/use-fx-risk-agent-settings";
import {
    FXR_AGENT_DOCK_WIDTH_MAX,
    FXR_AGENT_DOCK_WIDTH_MIN,
    useFxRiskAgentDockWidth,
} from "../hooks/use-fx-risk-agent-dock-width";

type FxRiskAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const FxRiskAgentDockContext = createContext<FxRiskAgentDockContextValue | null>(null);

function useFxRiskAgentDockContext(): FxRiskAgentDockContextValue {
    const ctx = useContext(FxRiskAgentDockContext);
    if (!ctx) {
        throw new Error("FxRiskAgentDock components must be used within FxRiskAgentDockProvider");
    }
    return ctx;
}

export function FxRiskAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useFxRiskAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 FXR 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 FXR 智能体",
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

    return <FxRiskAgentDockContext.Provider value={value}>{children}</FxRiskAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function FxRiskAgentTopbarToggle() {
    const { agentName, open, toggle } = useFxRiskAgentDockContext();

    return (
        <button
            type="button"
            className={`fx-risk-agent-top-btn${open ? " fx-risk-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="fx-risk-agent-top-toggle"
            onClick={toggle}
        >
            <span className="fx-risk-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function FxRiskAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useFxRiskAgentDockContext();
    const { width, resizing, onResizePointerDown } = useFxRiskAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="fx-risk-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="fx-risk-agent-dock"
            style={{ width }}
        >
            <div
                className={`fx-risk-agent-dock-resize${resizing ? " fx-risk-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={FXR_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={FXR_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="fx-risk-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="fx-risk-agent-dock-hd">
                <span className="fx-risk-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="fx-risk-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="fx-risk-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="fx-risk-agent-publish-iframe"
            />
        </aside>
    );
}

export function FxRiskAgentDockPanel() {
    return <FxRiskAgentDockPanelInner />;
}
