import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    MfgVarAgentDockPanel,
    MfgVarAgentDockProvider,
    MfgVarAgentTopbarToggle,
} from "../components/mfg-var-agent-float-embed";
import "../styles/mfg_var.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const MFGV_APP_TITLE = "生产成本偏差自治助手应用";

export function MfgVarLayout() {
    return (
        <MfgVarAgentDockProvider>
            <div className="mfg-var-root mfg-var-root--with-agent-slot" data-mfg-var-shell>
                <div className="mfg-var-main">
                    <header className="mfg-var-topbar">
                        <div className="mfg-var-topbar-inner">
                            <div className="mfg-var-topbar-brand" title={MFGV_APP_TITLE}>
                                <div className="mfg-var-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="mfg-var-topbar-title">{MFGV_APP_TITLE}</span>
                            </div>

                            <nav className="mfg-var-topnav" aria-label="MFGV 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "mfg-var-topnav-link active"
                                                : "mfg-var-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="mfg-var-topbar-actions">
                                <MfgVarAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="mfg-var-page">
                        <Outlet />
                    </div>
                </div>
                <MfgVarAgentDockPanel />
            </div>
        </MfgVarAgentDockProvider>
    );
}
