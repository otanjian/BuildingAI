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

import { useServiceSlaAgentSettings } from "../hooks/use-service-sla-agent-settings";
import {
    SLA_AGENT_DOCK_WIDTH_MAX,
    SLA_AGENT_DOCK_WIDTH_MIN,
    useServiceSlaAgentDockWidth,
} from "../hooks/use-service-sla-agent-dock-width";

type ServiceSlaAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const ServiceSlaAgentDockContext = createContext<ServiceSlaAgentDockContextValue | null>(null);

function useServiceSlaAgentDockContext(): ServiceSlaAgentDockContextValue {
    const ctx = useContext(ServiceSlaAgentDockContext);
    if (!ctx) {
        throw new Error("ServiceSlaAgentDock components must be used within ServiceSlaAgentDockProvider");
    }
    return ctx;
}

export function ServiceSlaAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useServiceSlaAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 SLA 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 SLA 智能体",
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

    return <ServiceSlaAgentDockContext.Provider value={value}>{children}</ServiceSlaAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function ServiceSlaAgentTopbarToggle() {
    const { agentName, open, toggle } = useServiceSlaAgentDockContext();

    return (
        <button
            type="button"
            className={`service-sla-agent-top-btn${open ? " service-sla-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="service-sla-agent-top-toggle"
            onClick={toggle}
        >
            <span className="service-sla-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function ServiceSlaAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useServiceSlaAgentDockContext();
    const { width, resizing, onResizePointerDown } = useServiceSlaAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="service-sla-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="service-sla-agent-dock"
            style={{ width }}
        >
            <div
                className={`service-sla-agent-dock-resize${resizing ? " service-sla-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={SLA_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={SLA_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="service-sla-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="service-sla-agent-dock-hd">
                <span className="service-sla-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="service-sla-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="service-sla-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="service-sla-agent-publish-iframe"
            />
        </aside>
    );
}

export function ServiceSlaAgentDockPanel() {
    return <ServiceSlaAgentDockPanelInner />;
}
