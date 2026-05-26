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

import { useContractAgentSettings } from "../hooks/use-contract-agent-settings";
import {
    CTR_AGENT_DOCK_WIDTH_MAX,
    CTR_AGENT_DOCK_WIDTH_MIN,
    useContractAgentDockWidth,
} from "../hooks/use-contract-agent-dock-width";

type ContractAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const ContractAgentDockContext = createContext<ContractAgentDockContextValue | null>(null);

function useContractAgentDockContext(): ContractAgentDockContextValue {
    const ctx = useContext(ContractAgentDockContext);
    if (!ctx) {
        throw new Error("ContractAgentDock components must be used within ContractAgentDockProvider");
    }
    return ctx;
}

export function ContractAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useContractAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 CTR 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 CTR 智能体",
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

    return <ContractAgentDockContext.Provider value={value}>{children}</ContractAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function ContractAgentTopbarToggle() {
    const { agentName, open, toggle } = useContractAgentDockContext();

    return (
        <button
            type="button"
            className={`contract-agent-top-btn${open ? " contract-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="contract-agent-top-toggle"
            onClick={toggle}
        >
            <span className="contract-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function ContractAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useContractAgentDockContext();
    const { width, resizing, onResizePointerDown } = useContractAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="contract-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="contract-agent-dock"
            style={{ width }}
        >
            <div
                className={`contract-agent-dock-resize${resizing ? " contract-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={CTR_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={CTR_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="contract-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="contract-agent-dock-hd">
                <span className="contract-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="contract-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="contract-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="contract-agent-publish-iframe"
            />
        </aside>
    );
}

export function ContractAgentDockPanel() {
    return <ContractAgentDockPanelInner />;
}
