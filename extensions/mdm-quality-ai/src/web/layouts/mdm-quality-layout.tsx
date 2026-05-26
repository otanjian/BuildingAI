import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    MdmQualityAgentDockPanel,
    MdmQualityAgentDockProvider,
    MdmQualityAgentTopbarToggle,
} from "../components/mdm-quality-agent-float-embed";
import "../styles/mdm_quality.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const MDM_APP_TITLE = "主数据质量自治助手应用";

export function MdmQualityLayout() {
    return (
        <MdmQualityAgentDockProvider>
            <div className="mdm-quality-root mdm-quality-root--with-agent-slot" data-mdm-quality-shell>
                <div className="mdm-quality-main">
                    <header className="mdm-quality-topbar">
                        <div className="mdm-quality-topbar-inner">
                            <div className="mdm-quality-topbar-brand" title={MDM_APP_TITLE}>
                                <div className="mdm-quality-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="mdm-quality-topbar-title">{MDM_APP_TITLE}</span>
                            </div>

                            <nav className="mdm-quality-topnav" aria-label="MDM 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "mdm-quality-topnav-link active"
                                                : "mdm-quality-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="mdm-quality-topbar-actions">
                                <MdmQualityAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="mdm-quality-page">
                        <Outlet />
                    </div>
                </div>
                <MdmQualityAgentDockPanel />
            </div>
        </MdmQualityAgentDockProvider>
    );
}
