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

import { useMdmQualityAgentSettings } from "../hooks/use-mdm-quality-agent-settings";
import {
    MDM_AGENT_DOCK_WIDTH_MAX,
    MDM_AGENT_DOCK_WIDTH_MIN,
    useMdmQualityAgentDockWidth,
} from "../hooks/use-mdm-quality-agent-dock-width";

type MdmQualityAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const MdmQualityAgentDockContext = createContext<MdmQualityAgentDockContextValue | null>(null);

function useMdmQualityAgentDockContext(): MdmQualityAgentDockContextValue {
    const ctx = useContext(MdmQualityAgentDockContext);
    if (!ctx) {
        throw new Error("MdmQualityAgentDock components must be used within MdmQualityAgentDockProvider");
    }
    return ctx;
}

export function MdmQualityAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useMdmQualityAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 MDM 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 MDM 智能体",
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

    return <MdmQualityAgentDockContext.Provider value={value}>{children}</MdmQualityAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function MdmQualityAgentTopbarToggle() {
    const { agentName, open, toggle } = useMdmQualityAgentDockContext();

    return (
        <button
            type="button"
            className={`mdm-quality-agent-top-btn${open ? " mdm-quality-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="mdm-quality-agent-top-toggle"
            onClick={toggle}
        >
            <span className="mdm-quality-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function MdmQualityAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useMdmQualityAgentDockContext();
    const { width, resizing, onResizePointerDown } = useMdmQualityAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="mdm-quality-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="mdm-quality-agent-dock"
            style={{ width }}
        >
            <div
                className={`mdm-quality-agent-dock-resize${resizing ? " mdm-quality-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={MDM_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={MDM_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="mdm-quality-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="mdm-quality-agent-dock-hd">
                <span className="mdm-quality-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="mdm-quality-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="mdm-quality-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="mdm-quality-agent-publish-iframe"
            />
        </aside>
    );
}

export function MdmQualityAgentDockPanel() {
    return <MdmQualityAgentDockPanelInner />;
}
