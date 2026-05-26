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

import { useAssetLifeAgentSettings } from "../hooks/use-asset-life-agent-settings";
import {
    AST_AGENT_DOCK_WIDTH_MAX,
    AST_AGENT_DOCK_WIDTH_MIN,
    useAssetLifeAgentDockWidth,
} from "../hooks/use-asset-life-agent-dock-width";

type AssetLifeAgentDockContextValue = {
    agentId: string;
    agentName: string;
    publishEmbedUrl: string | null;
    publishReady: boolean;
    ready: boolean;
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
};

const AssetLifeAgentDockContext = createContext<AssetLifeAgentDockContextValue | null>(null);

function useAssetLifeAgentDockContext(): AssetLifeAgentDockContextValue {
    const ctx = useContext(AssetLifeAgentDockContext);
    if (!ctx) {
        throw new Error("AssetLifeAgentDock components must be used within AssetLifeAgentDockProvider");
    }
    return ctx;
}

export function AssetLifeAgentDockProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { agentId, agentName, publishEmbedUrl, publishReady, loading, ready } =
        useAssetLifeAgentSettings();
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        if (!agentId) {
            return;
        }
        if (!publishReady || !publishEmbedUrl) {
            toast.error(
                agentId
                    ? `请先在设置中「更新 AST 智能体」或保存，以开启 WebAPP 发布后再打开「${agentName}」`
                    : "请先在设置中绑定 AST 智能体",
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

    return <AssetLifeAgentDockContext.Provider value={value}>{children}</AssetLifeAgentDockContext.Provider>;
}

/** Top bar control (replaces bottom-right FAB). */
export function AssetLifeAgentTopbarToggle() {
    const { agentName, open, toggle } = useAssetLifeAgentDockContext();

    return (
        <button
            type="button"
            className={`asset-life-agent-top-btn${open ? " asset-life-agent-top-btn--active" : ""}`}
            aria-label={open ? "关闭智能体对话" : `打开${agentName}`}
            aria-expanded={open}
            data-testid="asset-life-agent-top-toggle"
            onClick={toggle}
        >
            <span className="asset-life-agent-top-btn-icon" aria-hidden>
                🤖
            </span>
        </button>
    );
}

function AssetLifeAgentDockPanelInner() {
    const { agentName, publishEmbedUrl, open, setOpen, ready } = useAssetLifeAgentDockContext();
    const { width, resizing, onResizePointerDown } = useAssetLifeAgentDockWidth();

    if (!open || !ready || !publishEmbedUrl) {
        return null;
    }

    return (
        <aside
            className="asset-life-agent-dock"
            aria-label={`${agentName}对话`}
            data-testid="asset-life-agent-dock"
            style={{ width }}
        >
            <div
                className={`asset-life-agent-dock-resize${resizing ? " asset-life-agent-dock-resize--active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="调整对话栏宽度"
                aria-valuemin={AST_AGENT_DOCK_WIDTH_MIN}
                aria-valuemax={AST_AGENT_DOCK_WIDTH_MAX}
                aria-valuenow={width}
                data-testid="asset-life-agent-dock-resize"
                onPointerDown={onResizePointerDown}
            />
            <div className="asset-life-agent-dock-hd">
                <span className="asset-life-agent-dock-title">{agentName}</span>
                <button
                    type="button"
                    className="asset-life-agent-dock-close"
                    aria-label="关闭智能体对话"
                    onClick={() => setOpen(false)}
                >
                    ✕
                </button>
            </div>
            <iframe
                className="asset-life-agent-dock-iframe"
                title={agentName}
                src={publishEmbedUrl}
                allow="clipboard-write; microphone; camera"
                data-testid="asset-life-agent-publish-iframe"
            />
        </aside>
    );
}

export function AssetLifeAgentDockPanel() {
    return <AssetLifeAgentDockPanelInner />;
}
