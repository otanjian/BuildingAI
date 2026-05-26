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

import { useQualityRcaAgentSettings } from "../hooks/use-quality-rca-agent-settings";
import {
    QRCA_AGENT_DOCK_WIDTH_MAX,
    QRCA_AGENT_DOCK_WIDTH_MIN,
    useQualityRcaAgentDockWidth,
} from "../hooks/use-quality-rca-agent-dock-width";

type QualityRcaAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const QualityRcaAgentDockContext = createContext<QualityRcaAgentDockContextValue | null>(null);

function useQualityRcaAgentDockContext(): QualityRcaAgentDockContextValue {
    const ctx = useContext(QualityRcaAgentDockContext);
    if (!ctx) {
        throw new Error("QualityRcaAgentDock components must be used within QualityRcaAgentDockProvider");
    }
    return ctx;
}

export function QualityRcaAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useQualityRcaAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 QRCA 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 QRCA 智能体",
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

    return <QualityRcaAgentDockContext.Provider value={value}>{children}</QualityRcaAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function QualityRcaAgentTopbarToggle() {
    const { agentName, open, toggle } = useQualityRcaAgentDockContext();

    return (
        <button
            type="button"
            className={`quality-rca-agent-top-btn${open ? " quality-rca-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="quality-rca-agent-top-toggle"
            onClick={toggle}
        >
            <span className="quality-rca-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function QualityRcaAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useQualityRcaAgentDockContext();
    const { width, resizing, onResizePointerDown } = useQualityRcaAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="quality-rca-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="quality-rca-agent-dock"
            style={{ width }}
        >
            <div
                className={`quality-rca-agent-dock-resize${resizing ? " quality-rca-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={QRCA_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={QRCA_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="quality-rca-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="quality-rca-agent-dock-hd">
                <span className="quality-rca-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="quality-rca-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="quality-rca-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="quality-rca-agent-publish-iframe"
            />
        </aside>
    );
}

export function QualityRcaAgentDockPanel() {
    return <QualityRcaAgentDockPanelInner />;
}
