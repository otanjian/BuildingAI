import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    FxRiskAgentDockPanel,
    FxRiskAgentDockProvider,
    FxRiskAgentTopbarToggle,
} from "../components/fx-risk-agent-float-embed";
import "../styles/fx_risk.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const FXR_APP_TITLE = "外汇风险自治助手应用";

export function FxRiskLayout() {
    return (
        <FxRiskAgentDockProvider>
            <div className="fx-risk-root fx-risk-root--with-agent-slot" data-fx-risk-shell>
                <div className="fx-risk-main">
                    <header className="fx-risk-topbar">
                        <div className="fx-risk-topbar-inner">
                            <div className="fx-risk-topbar-brand" title={FXR_APP_TITLE}>
                                <div className="fx-risk-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="fx-risk-topbar-title">{FXR_APP_TITLE}</span>
                            </div>

                            <nav className="fx-risk-topnav" aria-label="FXR 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "fx-risk-topnav-link active"
                                                : "fx-risk-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="fx-risk-topbar-actions">
                                <FxRiskAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="fx-risk-page">
                        <Outlet />
                    </div>
                </div>
                <FxRiskAgentDockPanel />
            </div>
        </FxRiskAgentDockProvider>
    );
}
