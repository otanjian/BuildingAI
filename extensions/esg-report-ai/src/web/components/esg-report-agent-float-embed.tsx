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

import { useEsgReportAgentSettings } from "../hooks/use-esg-report-agent-settings";
import {
    ESG_AGENT_DOCK_WIDTH_MAX,
    ESG_AGENT_DOCK_WIDTH_MIN,
    useEsgReportAgentDockWidth,
} from "../hooks/use-esg-report-agent-dock-width";

type EsgReportAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const EsgReportAgentDockContext = createContext<EsgReportAgentDockContextValue | null>(null);

function useEsgReportAgentDockContext(): EsgReportAgentDockContextValue {
    const ctx = useContext(EsgReportAgentDockContext);
    if (!ctx) {
        throw new Error("EsgReportAgentDock components must be used within EsgReportAgentDockProvider");
    }
    return ctx;
}

export function EsgReportAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useEsgReportAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 ESG 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 ESG 智能体",
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

    return <EsgReportAgentDockContext.Provider value={value}>{children}</EsgReportAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function EsgReportAgentTopbarToggle() {
    const { agentName, open, toggle } = useEsgReportAgentDockContext();

    return (
        <button
            type="button"
            className={`esg-report-agent-top-btn${open ? " esg-report-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="esg-report-agent-top-toggle"
            onClick={toggle}
        >
            <span className="esg-report-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function EsgReportAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useEsgReportAgentDockContext();
    const { width, resizing, onResizePointerDown } = useEsgReportAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="esg-report-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="esg-report-agent-dock"
            style={{ width }}
        >
            <div
                className={`esg-report-agent-dock-resize${resizing ? " esg-report-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={ESG_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={ESG_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="esg-report-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="esg-report-agent-dock-hd">
                <span className="esg-report-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="esg-report-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="esg-report-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="esg-report-agent-publish-iframe"
            />
        </aside>
    );
}

export function EsgReportAgentDockPanel() {
    return <EsgReportAgentDockPanelInner />;
}
