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

import { useForecastAgentSettings } from "../hooks/use-forecast-agent-settings";
import {
    FCST_AGENT_DOCK_WIDTH_MAX,
    FCST_AGENT_DOCK_WIDTH_MIN,
    useForecastAgentDockWidth,
} from "../hooks/use-forecast-agent-dock-width";

type ForecastAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const ForecastAgentDockContext = createContext<ForecastAgentDockContextValue | null>(null);

function useForecastAgentDockContext(): ForecastAgentDockContextValue {
    const ctx = useContext(ForecastAgentDockContext);
    if (!ctx) {
        throw new Error("ForecastAgentDock components must be used within ForecastAgentDockProvider");
    }
    return ctx;
}

export function ForecastAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useForecastAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 FCST 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 FCST 智能体",
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

    return <ForecastAgentDockContext.Provider value={value}>{children}</ForecastAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function ForecastAgentTopbarToggle() {
    const { agentName, open, toggle } = useForecastAgentDockContext();

    return (
        <button
            type="button"
            className={`forecast-agent-top-btn${open ? " forecast-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="forecast-agent-top-toggle"
            onClick={toggle}
        >
            <span className="forecast-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function ForecastAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useForecastAgentDockContext();
    const { width, resizing, onResizePointerDown } = useForecastAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="forecast-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="forecast-agent-dock"
            style={{ width }}
        >
            <div
                className={`forecast-agent-dock-resize${resizing ? " forecast-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={FCST_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={FCST_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="forecast-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="forecast-agent-dock-hd">
                <span className="forecast-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="forecast-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="forecast-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="forecast-agent-publish-iframe"
            />
        </aside>
    );
}

export function ForecastAgentDockPanel() {
    return <ForecastAgentDockPanelInner />;
}
