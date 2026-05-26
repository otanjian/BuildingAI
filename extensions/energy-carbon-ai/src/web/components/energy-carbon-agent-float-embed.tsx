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

import { useEnergyCarbonAgentSettings } from "../hooks/use-energy-carbon-agent-settings";
import {
    ECO_AGENT_DOCK_WIDTH_MAX,
    ECO_AGENT_DOCK_WIDTH_MIN,
    useEnergyCarbonAgentDockWidth,
} from "../hooks/use-energy-carbon-agent-dock-width";

type EnergyCarbonAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const EnergyCarbonAgentDockContext = createContext<EnergyCarbonAgentDockContextValue | null>(null);

function useEnergyCarbonAgentDockContext(): EnergyCarbonAgentDockContextValue {
    const ctx = useContext(EnergyCarbonAgentDockContext);
    if (!ctx) {
        throw new Error("EnergyCarbonAgentDock components must be used within EnergyCarbonAgentDockProvider");
    }
    return ctx;
}

export function EnergyCarbonAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useEnergyCarbonAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 ECO 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 ECO 智能体",
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

    return <EnergyCarbonAgentDockContext.Provider value={value}>{children}</EnergyCarbonAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function EnergyCarbonAgentTopbarToggle() {
    const { agentName, open, toggle } = useEnergyCarbonAgentDockContext();

    return (
        <button
            type="button"
            className={`energy-carbon-agent-top-btn${open ? " energy-carbon-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="energy-carbon-agent-top-toggle"
            onClick={toggle}
        >
            <span className="energy-carbon-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function EnergyCarbonAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useEnergyCarbonAgentDockContext();
    const { width, resizing, onResizePointerDown } = useEnergyCarbonAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="energy-carbon-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="energy-carbon-agent-dock"
            style={{ width }}
        >
            <div
                className={`energy-carbon-agent-dock-resize${resizing ? " energy-carbon-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={ECO_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={ECO_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="energy-carbon-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="energy-carbon-agent-dock-hd">
                <span className="energy-carbon-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="energy-carbon-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="energy-carbon-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="energy-carbon-agent-publish-iframe"
            />
        </aside>
    );
}

export function EnergyCarbonAgentDockPanel() {
    return <EnergyCarbonAgentDockPanelInner />;
}
