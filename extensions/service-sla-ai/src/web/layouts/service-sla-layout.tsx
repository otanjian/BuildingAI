import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    ServiceSlaAgentDockPanel,
    ServiceSlaAgentDockProvider,
    ServiceSlaAgentTopbarToggle,
} from "../components/service-sla-agent-float-embed";
import "../styles/service_sla.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const SLA_APP_TITLE = "售后服务 SLA 自治助手应用";

export function ServiceSlaLayout() {
    return (
        <ServiceSlaAgentDockProvider>
            <div className="service-sla-root service-sla-root--with-agent-slot" data-service-sla-shell>
                <div className="service-sla-main">
                    <header className="service-sla-topbar">
                        <div className="service-sla-topbar-inner">
                            <div className="service-sla-topbar-brand" title={SLA_APP_TITLE}>
                                <div className="service-sla-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="service-sla-topbar-title">{SLA_APP_TITLE}</span>
                            </div>

                            <nav className="service-sla-topnav" aria-label="SLA 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "service-sla-topnav-link active"
                                                : "service-sla-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="service-sla-topbar-actions">
                                <ServiceSlaAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="service-sla-page">
                        <Outlet />
                    </div>
                </div>
                <ServiceSlaAgentDockPanel />
            </div>
        </ServiceSlaAgentDockProvider>
    );
}
