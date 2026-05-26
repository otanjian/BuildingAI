import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    EnergyCarbonAgentDockPanel,
    EnergyCarbonAgentDockProvider,
    EnergyCarbonAgentTopbarToggle,
} from "../components/energy-carbon-agent-float-embed";
import "../styles/energy_carbon.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const ECO_APP_TITLE = "能源与碳排放自治助手应用";

export function EnergyCarbonLayout() {
    return (
        <EnergyCarbonAgentDockProvider>
            <div className="energy-carbon-root energy-carbon-root--with-agent-slot" data-energy-carbon-shell>
                <div className="energy-carbon-main">
                    <header className="energy-carbon-topbar">
                        <div className="energy-carbon-topbar-inner">
                            <div className="energy-carbon-topbar-brand" title={ECO_APP_TITLE}>
                                <div className="energy-carbon-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="energy-carbon-topbar-title">{ECO_APP_TITLE}</span>
                            </div>

                            <nav className="energy-carbon-topnav" aria-label="ECO 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "energy-carbon-topnav-link active"
                                                : "energy-carbon-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="energy-carbon-topbar-actions">
                                <EnergyCarbonAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="energy-carbon-page">
                        <Outlet />
                    </div>
                </div>
                <EnergyCarbonAgentDockPanel />
            </div>
        </EnergyCarbonAgentDockProvider>
    );
}
