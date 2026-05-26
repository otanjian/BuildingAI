import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    ArRiskAgentDockPanel,
    ArRiskAgentDockProvider,
    ArRiskAgentTopbarToggle,
} from "../components/ar-risk-agent-float-embed";
import "../styles/ar_risk.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const ARR_APP_TITLE = "应收账款风控自治助手应用";

export function ArRiskLayout() {
    return (
        <ArRiskAgentDockProvider>
            <div className="ar-risk-root ar-risk-root--with-agent-slot" data-ar-risk-shell>
                <div className="ar-risk-main">
                    <header className="ar-risk-topbar">
                        <div className="ar-risk-topbar-inner">
                            <div className="ar-risk-topbar-brand" title={ARR_APP_TITLE}>
                                <div className="ar-risk-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="ar-risk-topbar-title">{ARR_APP_TITLE}</span>
                            </div>

                            <nav className="ar-risk-topnav" aria-label="ARR 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "ar-risk-topnav-link active"
                                                : "ar-risk-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="ar-risk-topbar-actions">
                                <ArRiskAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="ar-risk-page">
                        <Outlet />
                    </div>
                </div>
                <ArRiskAgentDockPanel />
            </div>
        </ArRiskAgentDockProvider>
    );
}
