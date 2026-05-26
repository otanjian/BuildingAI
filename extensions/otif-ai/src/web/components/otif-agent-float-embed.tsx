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

import { useOtifAgentSettings } from "../hooks/use-otif-agent-settings";
import {
    OTIF_AGENT_DOCK_WIDTH_MAX,
    OTIF_AGENT_DOCK_WIDTH_MIN,
    useOtifAgentDockWidth,
} from "../hooks/use-otif-agent-dock-width";

type OtifAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const OtifAgentDockContext = createContext<OtifAgentDockContextValue | null>(null);

function useOtifAgentDockContext(): OtifAgentDockContextValue {
    const ctx = useContext(OtifAgentDockContext);
    if (!ctx) {
        throw new Error("OtifAgentDock components must be used within OtifAgentDockProvider");
    }
    return ctx;
}

export function OtifAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useOtifAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 OTIF 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 OTIF 智能体",
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

    return <OtifAgentDockContext.Provider value={value}>{children}</OtifAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function OtifAgentTopbarToggle() {
    const { agentName, open, toggle } = useOtifAgentDockContext();

    return (
        <button
            type="button"
            className={`otif-agent-top-btn${open ? " otif-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="otif-agent-top-toggle"
            onClick={toggle}
        >
            <span className="otif-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function OtifAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useOtifAgentDockContext();
    const { width, resizing, onResizePointerDown } = useOtifAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="otif-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="otif-agent-dock"
            style={{ width }}
        >
            <div
                className={`otif-agent-dock-resize${resizing ? " otif-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={OTIF_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={OTIF_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="otif-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="otif-agent-dock-hd">
                <span className="otif-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="otif-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="otif-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="otif-agent-publish-iframe"
            />
        </aside>
    );
}

export function OtifAgentDockPanel() {
    return <OtifAgentDockPanelInner />;
}
