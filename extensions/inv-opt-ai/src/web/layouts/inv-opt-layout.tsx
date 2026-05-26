import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    InvOptAgentDockPanel,
    InvOptAgentDockProvider,
    InvOptAgentTopbarToggle,
} from "../components/inv-opt-agent-float-embed";
import "../styles/inv_opt.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const INVO_APP_TITLE = "库存优化自治助手应用";

export function InvOptLayout() {
    return (
        <InvOptAgentDockProvider>
            <div className="inv-opt-root inv-opt-root--with-agent-slot" data-inv-opt-shell>
                <div className="inv-opt-main">
                    <header className="inv-opt-topbar">
                        <div className="inv-opt-topbar-inner">
                            <div className="inv-opt-topbar-brand" title={INVO_APP_TITLE}>
                                <div className="inv-opt-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="inv-opt-topbar-title">{INVO_APP_TITLE}</span>
                            </div>

                            <nav className="inv-opt-topnav" aria-label="INVO 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "inv-opt-topnav-link active"
                                                : "inv-opt-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="inv-opt-topbar-actions">
                                <InvOptAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="inv-opt-page">
                        <Outlet />
                    </div>
                </div>
                <InvOptAgentDockPanel />
            </div>
        </InvOptAgentDockProvider>
    );
}
