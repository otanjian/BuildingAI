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

import { useApOptAgentSettings } from "../hooks/use-ap-opt-agent-settings";
import {
    APO_AGENT_DOCK_WIDTH_MAX,
    APO_AGENT_DOCK_WIDTH_MIN,
    useApOptAgentDockWidth,
} from "../hooks/use-ap-opt-agent-dock-width";

type ApOptAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const ApOptAgentDockContext = createContext<ApOptAgentDockContextValue | null>(null);

function useApOptAgentDockContext(): ApOptAgentDockContextValue {
    const ctx = useContext(ApOptAgentDockContext);
    if (!ctx) {
        throw new Error("ApOptAgentDock components must be used within ApOptAgentDockProvider");
    }
    return ctx;
}

export function ApOptAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useApOptAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 APO 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 APO 智能体",
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

    return <ApOptAgentDockContext.Provider value={value}>{children}</ApOptAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function ApOptAgentTopbarToggle() {
    const { agentName, open, toggle } = useApOptAgentDockContext();

    return (
        <button
            type="button"
            className={`ap-opt-agent-top-btn${open ? " ap-opt-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="ap-opt-agent-top-toggle"
            onClick={toggle}
        >
            <span className="ap-opt-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function ApOptAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useApOptAgentDockContext();
    const { width, resizing, onResizePointerDown } = useApOptAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="ap-opt-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="ap-opt-agent-dock"
            style={{ width }}
        >
            <div
                className={`ap-opt-agent-dock-resize${resizing ? " ap-opt-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={APO_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={APO_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="ap-opt-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="ap-opt-agent-dock-hd">
                <span className="ap-opt-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="ap-opt-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="ap-opt-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="ap-opt-agent-publish-iframe"
            />
        </aside>
    );
}

export function ApOptAgentDockPanel() {
    return <ApOptAgentDockPanelInner />;
}
