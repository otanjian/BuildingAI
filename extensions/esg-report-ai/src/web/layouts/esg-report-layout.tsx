import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    EsgReportAgentDockPanel,
    EsgReportAgentDockProvider,
    EsgReportAgentTopbarToggle,
} from "../components/esg-report-agent-float-embed";
import "../styles/esg_report.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const ESG_APP_TITLE = "ESG 合规披露自治助手应用";

export function EsgReportLayout() {
    return (
        <EsgReportAgentDockProvider>
            <div className="esg-report-root esg-report-root--with-agent-slot" data-esg-report-shell>
                <div className="esg-report-main">
                    <header className="esg-report-topbar">
                        <div className="esg-report-topbar-inner">
                            <div className="esg-report-topbar-brand" title={ESG_APP_TITLE}>
                                <div className="esg-report-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="esg-report-topbar-title">{ESG_APP_TITLE}</span>
                            </div>

                            <nav className="esg-report-topnav" aria-label="ESG 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "esg-report-topnav-link active"
                                                : "esg-report-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="esg-report-topbar-actions">
                                <EsgReportAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="esg-report-page">
                        <Outlet />
                    </div>
                </div>
                <EsgReportAgentDockPanel />
            </div>
        </EsgReportAgentDockProvider>
    );
}
