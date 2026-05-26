import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    EhcsAgentDockPanel,
    EhcsAgentDockProvider,
    EhcsAgentTopbarToggle,
} from "../components/ehcs-agent-float-embed";
import "../styles/ehcs.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const EHCS_APP_TITLE = "EHCS数据健康自治应用";

export function EhcsLayout() {
    return (
        <EhcsAgentDockProvider>
            <div className="ehcs-root ehcs-root--with-agent-slot" data-ehcs-shell>
                <div className="ehcs-main">
                    <header className="ehcs-topbar">
                        <div className="ehcs-topbar-inner">
                            <div className="ehcs-topbar-brand" title={EHCS_APP_TITLE}>
                                <div className="ehcs-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="ehcs-topbar-title">{EHCS_APP_TITLE}</span>
                            </div>

                            <nav className="ehcs-topnav" aria-label="EHCS 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "ehcs-topnav-link active"
                                                : "ehcs-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="ehcs-topbar-actions">
                                <EhcsAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="ehcs-page">
                        <Outlet />
                    </div>
                </div>
                <EhcsAgentDockPanel />
            </div>
        </EhcsAgentDockProvider>
    );
}
