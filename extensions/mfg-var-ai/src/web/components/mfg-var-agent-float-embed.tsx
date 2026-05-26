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

import { useMfgVarAgentSettings } from "../hooks/use-mfg-var-agent-settings";
import {
    MFGV_AGENT_DOCK_WIDTH_MAX,
    MFGV_AGENT_DOCK_WIDTH_MIN,
    useMfgVarAgentDockWidth,
} from "../hooks/use-mfg-var-agent-dock-width";

type MfgVarAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const MfgVarAgentDockContext = createContext<MfgVarAgentDockContextValue | null>(null);

function useMfgVarAgentDockContext(): MfgVarAgentDockContextValue {
    const ctx = useContext(MfgVarAgentDockContext);
    if (!ctx) {
        throw new Error("MfgVarAgentDock components must be used within MfgVarAgentDockProvider");
    }
    return ctx;
}

export function MfgVarAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useMfgVarAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 MFGV 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 MFGV 智能体",
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

    return <MfgVarAgentDockContext.Provider value={value}>{children}</MfgVarAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function MfgVarAgentTopbarToggle() {
    const { agentName, open, toggle } = useMfgVarAgentDockContext();

    return (
        <button
            type="button"
            className={`mfg-var-agent-top-btn${open ? " mfg-var-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="mfg-var-agent-top-toggle"
            onClick={toggle}
        >
            <span className="mfg-var-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function MfgVarAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useMfgVarAgentDockContext();
    const { width, resizing, onResizePointerDown } = useMfgVarAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="mfg-var-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="mfg-var-agent-dock"
            style={{ width }}
        >
            <div
                className={`mfg-var-agent-dock-resize${resizing ? " mfg-var-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={MFGV_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={MFGV_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="mfg-var-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="mfg-var-agent-dock-hd">
                <span className="mfg-var-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="mfg-var-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="mfg-var-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="mfg-var-agent-publish-iframe"
            />
        </aside>
    );
}

export function MfgVarAgentDockPanel() {
    return <MfgVarAgentDockPanelInner />;
}
