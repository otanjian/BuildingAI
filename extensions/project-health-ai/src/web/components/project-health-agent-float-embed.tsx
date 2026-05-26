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

import { useProjectHealthAgentSettings } from "../hooks/use-project-health-agent-settings";
import {
    PRJ_AGENT_DOCK_WIDTH_MAX,
    PRJ_AGENT_DOCK_WIDTH_MIN,
    useProjectHealthAgentDockWidth,
} from "../hooks/use-project-health-agent-dock-width";

type ProjectHealthAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const ProjectHealthAgentDockContext = createContext<ProjectHealthAgentDockContextValue | null>(null);

function useProjectHealthAgentDockContext(): ProjectHealthAgentDockContextValue {
    const ctx = useContext(ProjectHealthAgentDockContext);
    if (!ctx) {
        throw new Error("ProjectHealthAgentDock components must be used within ProjectHealthAgentDockProvider");
    }
    return ctx;
}

export function ProjectHealthAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useProjectHealthAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 PRJ 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 PRJ 智能体",
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

    return <ProjectHealthAgentDockContext.Provider value={value}>{children}</ProjectHealthAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function ProjectHealthAgentTopbarToggle() {
    const { agentName, open, toggle } = useProjectHealthAgentDockContext();

    return (
        <button
            type="button"
            className={`project-health-agent-top-btn${open ? " project-health-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="project-health-agent-top-toggle"
            onClick={toggle}
        >
            <span className="project-health-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function ProjectHealthAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useProjectHealthAgentDockContext();
    const { width, resizing, onResizePointerDown } = useProjectHealthAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="project-health-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="project-health-agent-dock"
            style={{ width }}
        >
            <div
                className={`project-health-agent-dock-resize${resizing ? " project-health-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={PRJ_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={PRJ_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="project-health-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="project-health-agent-dock-hd">
                <span className="project-health-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="project-health-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="project-health-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="project-health-agent-publish-iframe"
            />
        </aside>
    );
}

export function ProjectHealthAgentDockPanel() {
    return <ProjectHealthAgentDockPanelInner />;
}
