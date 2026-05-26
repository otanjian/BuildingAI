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

import { useProcAuditAgentSettings } from "../hooks/use-proc-audit-agent-settings";
import {
    PROC_AGENT_DOCK_WIDTH_MAX,
    PROC_AGENT_DOCK_WIDTH_MIN,
    useProcAuditAgentDockWidth,
} from "../hooks/use-proc-audit-agent-dock-width";

type ProcAuditAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const ProcAuditAgentDockContext = createContext<ProcAuditAgentDockContextValue | null>(null);

function useProcAuditAgentDockContext(): ProcAuditAgentDockContextValue {
    const ctx = useContext(ProcAuditAgentDockContext);
    if (!ctx) {
        throw new Error("ProcAuditAgentDock components must be used within ProcAuditAgentDockProvider");
    }
    return ctx;
}

export function ProcAuditAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useProcAuditAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 PROC 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 PROC 智能体",
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

    return <ProcAuditAgentDockContext.Provider value={value}>{children}</ProcAuditAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function ProcAuditAgentTopbarToggle() {
    const { agentName, open, toggle } = useProcAuditAgentDockContext();

    return (
        <button
            type="button"
            className={`proc-audit-agent-top-btn${open ? " proc-audit-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="proc-audit-agent-top-toggle"
            onClick={toggle}
        >
            <span className="proc-audit-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function ProcAuditAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useProcAuditAgentDockContext();
    const { width, resizing, onResizePointerDown } = useProcAuditAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="proc-audit-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="proc-audit-agent-dock"
            style={{ width }}
        >
            <div
                className={`proc-audit-agent-dock-resize${resizing ? " proc-audit-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={PROC_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={PROC_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="proc-audit-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="proc-audit-agent-dock-hd">
                <span className="proc-audit-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="proc-audit-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="proc-audit-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="proc-audit-agent-publish-iframe"
            />
        </aside>
    );
}

export function ProcAuditAgentDockPanel() {
    return <ProcAuditAgentDockPanelInner />;
}
