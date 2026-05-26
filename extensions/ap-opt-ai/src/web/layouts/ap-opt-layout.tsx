import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    ApOptAgentDockPanel,
    ApOptAgentDockProvider,
    ApOptAgentTopbarToggle,
} from "../components/ap-opt-agent-float-embed";
import "../styles/ap_opt.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const APO_APP_TITLE = "应付账款优化自治助手应用";

export function ApOptLayout() {
    return (
        <ApOptAgentDockProvider>
            <div className="ap-opt-root ap-opt-root--with-agent-slot" data-ap-opt-shell>
                <div className="ap-opt-main">
                    <header className="ap-opt-topbar">
                        <div className="ap-opt-topbar-inner">
                            <div className="ap-opt-topbar-brand" title={APO_APP_TITLE}>
                                <div className="ap-opt-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="ap-opt-topbar-title">{APO_APP_TITLE}</span>
                            </div>

                            <nav className="ap-opt-topnav" aria-label="APO 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "ap-opt-topnav-link active"
                                                : "ap-opt-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="ap-opt-topbar-actions">
                                <ApOptAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="ap-opt-page">
                        <Outlet />
                    </div>
                </div>
                <ApOptAgentDockPanel />
            </div>
        </ApOptAgentDockProvider>
    );
}
