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

import { useHrComplianceAgentSettings } from "../hooks/use-hr-compliance-agent-settings";
import {
    HRC_AGENT_DOCK_WIDTH_MAX,
    HRC_AGENT_DOCK_WIDTH_MIN,
    useHrComplianceAgentDockWidth,
} from "../hooks/use-hr-compliance-agent-dock-width";

type HrComplianceAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const HrComplianceAgentDockContext = createContext<HrComplianceAgentDockContextValue | null>(null);

function useHrComplianceAgentDockContext(): HrComplianceAgentDockContextValue {
    const ctx = useContext(HrComplianceAgentDockContext);
    if (!ctx) {
        throw new Error("HrComplianceAgentDock components must be used within HrComplianceAgentDockProvider");
    }
    return ctx;
}

export function HrComplianceAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useHrComplianceAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 HRC 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 HRC 智能体",
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

    return <HrComplianceAgentDockContext.Provider value={value}>{children}</HrComplianceAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function HrComplianceAgentTopbarToggle() {
    const { agentName, open, toggle } = useHrComplianceAgentDockContext();

    return (
        <button
            type="button"
            className={`hr-compliance-agent-top-btn${open ? " hr-compliance-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="hr-compliance-agent-top-toggle"
            onClick={toggle}
        >
            <span className="hr-compliance-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function HrComplianceAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useHrComplianceAgentDockContext();
    const { width, resizing, onResizePointerDown } = useHrComplianceAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="hr-compliance-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="hr-compliance-agent-dock"
            style={{ width }}
        >
            <div
                className={`hr-compliance-agent-dock-resize${resizing ? " hr-compliance-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={HRC_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={HRC_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="hr-compliance-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="hr-compliance-agent-dock-hd">
                <span className="hr-compliance-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="hr-compliance-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="hr-compliance-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="hr-compliance-agent-publish-iframe"
            />
        </aside>
    );
}

export function HrComplianceAgentDockPanel() {
    return <HrComplianceAgentDockPanelInner />;
}
