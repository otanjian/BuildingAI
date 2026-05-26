import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    ProcAuditAgentDockPanel,
    ProcAuditAgentDockProvider,
    ProcAuditAgentTopbarToggle,
} from "../components/proc-audit-agent-float-embed";
import "../styles/proc_audit.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const PROC_APP_TITLE = "采购合规审查自治助手应用";

export function ProcAuditLayout() {
    return (
        <ProcAuditAgentDockProvider>
            <div className="proc-audit-root proc-audit-root--with-agent-slot" data-proc-audit-shell>
                <div className="proc-audit-main">
                    <header className="proc-audit-topbar">
                        <div className="proc-audit-topbar-inner">
                            <div className="proc-audit-topbar-brand" title={PROC_APP_TITLE}>
                                <div className="proc-audit-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="proc-audit-topbar-title">{PROC_APP_TITLE}</span>
                            </div>

                            <nav className="proc-audit-topnav" aria-label="PROC 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "proc-audit-topnav-link active"
                                                : "proc-audit-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="proc-audit-topbar-actions">
                                <ProcAuditAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="proc-audit-page">
                        <Outlet />
                    </div>
                </div>
                <ProcAuditAgentDockPanel />
            </div>
        </ProcAuditAgentDockProvider>
    );
}
