import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    HrComplianceAgentDockPanel,
    HrComplianceAgentDockProvider,
    HrComplianceAgentTopbarToggle,
} from "../components/hr-compliance-agent-float-embed";
import "../styles/hr_compliance.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const HRC_APP_TITLE = "人力资源合规自治助手应用";

export function HrComplianceLayout() {
    return (
        <HrComplianceAgentDockProvider>
            <div className="hr-compliance-root hr-compliance-root--with-agent-slot" data-hr-compliance-shell>
                <div className="hr-compliance-main">
                    <header className="hr-compliance-topbar">
                        <div className="hr-compliance-topbar-inner">
                            <div className="hr-compliance-topbar-brand" title={HRC_APP_TITLE}>
                                <div className="hr-compliance-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="hr-compliance-topbar-title">{HRC_APP_TITLE}</span>
                            </div>

                            <nav className="hr-compliance-topnav" aria-label="HRC 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "hr-compliance-topnav-link active"
                                                : "hr-compliance-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="hr-compliance-topbar-actions">
                                <HrComplianceAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="hr-compliance-page">
                        <Outlet />
                    </div>
                </div>
                <HrComplianceAgentDockPanel />
            </div>
        </HrComplianceAgentDockProvider>
    );
}
