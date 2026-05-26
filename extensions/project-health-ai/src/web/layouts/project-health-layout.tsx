import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    ProjectHealthAgentDockPanel,
    ProjectHealthAgentDockProvider,
    ProjectHealthAgentTopbarToggle,
} from "../components/project-health-agent-float-embed";
import "../styles/project_health.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const PRJ_APP_TITLE = "项目交付健康自治助手应用";

export function ProjectHealthLayout() {
    return (
        <ProjectHealthAgentDockProvider>
            <div className="project-health-root project-health-root--with-agent-slot" data-project-health-shell>
                <div className="project-health-main">
                    <header className="project-health-topbar">
                        <div className="project-health-topbar-inner">
                            <div className="project-health-topbar-brand" title={PRJ_APP_TITLE}>
                                <div className="project-health-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="project-health-topbar-title">{PRJ_APP_TITLE}</span>
                            </div>

                            <nav className="project-health-topnav" aria-label="PRJ 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "project-health-topnav-link active"
                                                : "project-health-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="project-health-topbar-actions">
                                <ProjectHealthAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="project-health-page">
                        <Outlet />
                    </div>
                </div>
                <ProjectHealthAgentDockPanel />
            </div>
        </ProjectHealthAgentDockProvider>
    );
}
