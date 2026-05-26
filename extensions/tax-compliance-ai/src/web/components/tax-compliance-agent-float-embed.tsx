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

import { useTaxComplianceAgentSettings } from "../hooks/use-tax-compliance-agent-settings";
import {
    TAX_AGENT_DOCK_WIDTH_MAX,
    TAX_AGENT_DOCK_WIDTH_MIN,
    useTaxComplianceAgentDockWidth,
} from "../hooks/use-tax-compliance-agent-dock-width";

type TaxComplianceAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const TaxComplianceAgentDockContext = createContext<TaxComplianceAgentDockContextValue | null>(null);

function useTaxComplianceAgentDockContext(): TaxComplianceAgentDockContextValue {
    const ctx = useContext(TaxComplianceAgentDockContext);
    if (!ctx) {
        throw new Error("TaxComplianceAgentDock components must be used within TaxComplianceAgentDockProvider");
    }
    return ctx;
}

export function TaxComplianceAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useTaxComplianceAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 TAX 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 TAX 智能体",
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

    return <TaxComplianceAgentDockContext.Provider value={value}>{children}</TaxComplianceAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function TaxComplianceAgentTopbarToggle() {
    const { agentName, open, toggle } = useTaxComplianceAgentDockContext();

    return (
        <button
            type="button"
            className={`tax-compliance-agent-top-btn${open ? " tax-compliance-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="tax-compliance-agent-top-toggle"
            onClick={toggle}
        >
            <span className="tax-compliance-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function TaxComplianceAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useTaxComplianceAgentDockContext();
    const { width, resizing, onResizePointerDown } = useTaxComplianceAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="tax-compliance-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="tax-compliance-agent-dock"
            style={{ width }}
        >
            <div
                className={`tax-compliance-agent-dock-resize${resizing ? " tax-compliance-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={TAX_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={TAX_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="tax-compliance-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="tax-compliance-agent-dock-hd">
                <span className="tax-compliance-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="tax-compliance-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="tax-compliance-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="tax-compliance-agent-publish-iframe"
            />
        </aside>
    );
}

export function TaxComplianceAgentDockPanel() {
    return <TaxComplianceAgentDockPanelInner />;
}
