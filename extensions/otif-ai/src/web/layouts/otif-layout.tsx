import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    OtifAgentDockPanel,
    OtifAgentDockProvider,
    OtifAgentTopbarToggle,
} from "../components/otif-agent-float-embed";
import "../styles/otif.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const OTIF_APP_TITLE = "供应链 OTIF 自治助手应用";

export function OtifLayout() {
    return (
        <OtifAgentDockProvider>
            <div className="otif-root otif-root--with-agent-slot" data-otif-shell>
                <div className="otif-main">
                    <header className="otif-topbar">
                        <div className="otif-topbar-inner">
                            <div className="otif-topbar-brand" title={OTIF_APP_TITLE}>
                                <div className="otif-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="otif-topbar-title">{OTIF_APP_TITLE}</span>
                            </div>

                            <nav className="otif-topnav" aria-label="OTIF 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "otif-topnav-link active"
                                                : "otif-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="otif-topbar-actions">
                                <OtifAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="otif-page">
                        <Outlet />
                    </div>
                </div>
                <OtifAgentDockPanel />
            </div>
        </OtifAgentDockProvider>
    );
}
