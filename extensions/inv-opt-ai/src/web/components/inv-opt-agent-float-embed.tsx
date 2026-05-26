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

import { useInvOptAgentSettings } from "../hooks/use-inv-opt-agent-settings";
import {
    INVO_AGENT_DOCK_WIDTH_MAX,
    INVO_AGENT_DOCK_WIDTH_MIN,
    useInvOptAgentDockWidth,
} from "../hooks/use-inv-opt-agent-dock-width";

type InvOptAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const InvOptAgentDockContext = createContext<InvOptAgentDockContextValue | null>(null);

function useInvOptAgentDockContext(): InvOptAgentDockContextValue {
    const ctx = useContext(InvOptAgentDockContext);
    if (!ctx) {
        throw new Error("InvOptAgentDock components must be used within InvOptAgentDockProvider");
    }
    return ctx;
}

export function InvOptAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useInvOptAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 INVO 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 INVO 智能体",
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

    return <InvOptAgentDockContext.Provider value={value}>{children}</InvOptAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function InvOptAgentTopbarToggle() {
    const { agentName, open, toggle } = useInvOptAgentDockContext();

    return (
        <button
            type="button"
            className={`inv-opt-agent-top-btn${open ? " inv-opt-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="inv-opt-agent-top-toggle"
            onClick={toggle}
        >
            <span className="inv-opt-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function InvOptAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useInvOptAgentDockContext();
    const { width, resizing, onResizePointerDown } = useInvOptAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="inv-opt-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="inv-opt-agent-dock"
            style={{ width }}
        >
            <div
                className={`inv-opt-agent-dock-resize${resizing ? " inv-opt-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={INVO_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={INVO_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="inv-opt-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="inv-opt-agent-dock-hd">
                <span className="inv-opt-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="inv-opt-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="inv-opt-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="inv-opt-agent-publish-iframe"
            />
        </aside>
    );
}

export function InvOptAgentDockPanel() {
    return <InvOptAgentDockPanelInner />;
}
