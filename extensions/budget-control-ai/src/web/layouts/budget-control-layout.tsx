import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    BudgetControlAgentDockPanel,
    BudgetControlAgentDockProvider,
    BudgetControlAgentTopbarToggle,
} from "../components/budget-control-agent-float-embed";
import "../styles/budget_control.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const BDG_APP_TITLE = "预算执行监控自治助手应用";

export function BudgetControlLayout() {
    return (
        <BudgetControlAgentDockProvider>
            <div className="budget-control-root budget-control-root--with-agent-slot" data-budget-control-shell>
                <div className="budget-control-main">
                    <header className="budget-control-topbar">
                        <div className="budget-control-topbar-inner">
                            <div className="budget-control-topbar-brand" title={BDG_APP_TITLE}>
                                <div className="budget-control-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="budget-control-topbar-title">{BDG_APP_TITLE}</span>
                            </div>

                            <nav className="budget-control-topnav" aria-label="BDG 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "budget-control-topnav-link active"
                                                : "budget-control-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="budget-control-topbar-actions">
                                <BudgetControlAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="budget-control-page">
                        <Outlet />
                    </div>
                </div>
                <BudgetControlAgentDockPanel />
            </div>
        </BudgetControlAgentDockProvider>
    );
}
