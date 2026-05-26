import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    AssetLifeAgentDockPanel,
    AssetLifeAgentDockProvider,
    AssetLifeAgentTopbarToggle,
} from "../components/asset-life-agent-float-embed";
import "../styles/asset_life.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const AST_APP_TITLE = "固定资产全生命周期自治助手应用";

export function AssetLifeLayout() {
    return (
        <AssetLifeAgentDockProvider>
            <div className="asset-life-root asset-life-root--with-agent-slot" data-asset-life-shell>
                <div className="asset-life-main">
                    <header className="asset-life-topbar">
                        <div className="asset-life-topbar-inner">
                            <div className="asset-life-topbar-brand" title={AST_APP_TITLE}>
                                <div className="asset-life-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="asset-life-topbar-title">{AST_APP_TITLE}</span>
                            </div>

                            <nav className="asset-life-topnav" aria-label="AST 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "asset-life-topnav-link active"
                                                : "asset-life-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="asset-life-topbar-actions">
                                <AssetLifeAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="asset-life-page">
                        <Outlet />
                    </div>
                </div>
                <AssetLifeAgentDockPanel />
            </div>
        </AssetLifeAgentDockProvider>
    );
}
