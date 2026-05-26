import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    QualityRcaAgentDockPanel,
    QualityRcaAgentDockProvider,
    QualityRcaAgentTopbarToggle,
} from "../components/quality-rca-agent-float-embed";
import "../styles/quality_rca.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const QRCA_APP_TITLE = "质量异常追溯自治助手应用";

export function QualityRcaLayout() {
    return (
        <QualityRcaAgentDockProvider>
            <div className="quality-rca-root quality-rca-root--with-agent-slot" data-quality-rca-shell>
                <div className="quality-rca-main">
                    <header className="quality-rca-topbar">
                        <div className="quality-rca-topbar-inner">
                            <div className="quality-rca-topbar-brand" title={QRCA_APP_TITLE}>
                                <div className="quality-rca-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="quality-rca-topbar-title">{QRCA_APP_TITLE}</span>
                            </div>

                            <nav className="quality-rca-topnav" aria-label="QRCA 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "quality-rca-topnav-link active"
                                                : "quality-rca-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="quality-rca-topbar-actions">
                                <QualityRcaAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="quality-rca-page">
                        <Outlet />
                    </div>
                </div>
                <QualityRcaAgentDockPanel />
            </div>
        </QualityRcaAgentDockProvider>
    );
}
