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

import { useBudgetControlAgentSettings } from "../hooks/use-budget-control-agent-settings";
import {
    BDG_AGENT_DOCK_WIDTH_MAX,
    BDG_AGENT_DOCK_WIDTH_MIN,
    useBudgetControlAgentDockWidth,
} from "../hooks/use-budget-control-agent-dock-width";

type BudgetControlAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const BudgetControlAgentDockContext = createContext<BudgetControlAgentDockContextValue | null>(null);

function useBudgetControlAgentDockContext(): BudgetControlAgentDockContextValue {
    const ctx = useContext(BudgetControlAgentDockContext);
    if (!ctx) {
        throw new Error("BudgetControlAgentDock components must be used within BudgetControlAgentDockProvider");
    }
    return ctx;
}

export function BudgetControlAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useBudgetControlAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 BDG 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 BDG 智能体",
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

    return <BudgetControlAgentDockContext.Provider value={value}>{children}</BudgetControlAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function BudgetControlAgentTopbarToggle() {
    const { agentName, open, toggle } = useBudgetControlAgentDockContext();

    return (
        <button
            type="button"
            className={`budget-control-agent-top-btn${open ? " budget-control-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="budget-control-agent-top-toggle"
            onClick={toggle}
        >
            <span className="budget-control-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function BudgetControlAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useBudgetControlAgentDockContext();
    const { width, resizing, onResizePointerDown } = useBudgetControlAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="budget-control-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="budget-control-agent-dock"
            style={{ width }}
        >
            <div
                className={`budget-control-agent-dock-resize${resizing ? " budget-control-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={BDG_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={BDG_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="budget-control-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="budget-control-agent-dock-hd">
                <span className="budget-control-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="budget-control-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="budget-control-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="budget-control-agent-publish-iframe"
            />
        </aside>
    );
}

export function BudgetControlAgentDockPanel() {
    return <BudgetControlAgentDockPanelInner />;
}
