import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    ForecastAgentDockPanel,
    ForecastAgentDockProvider,
    ForecastAgentTopbarToggle,
} from "../components/forecast-agent-float-embed";
import "../styles/forecast.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const FCST_APP_TITLE = "销售预测校准自治助手应用";

export function ForecastLayout() {
    return (
        <ForecastAgentDockProvider>
            <div className="forecast-root forecast-root--with-agent-slot" data-forecast-shell>
                <div className="forecast-main">
                    <header className="forecast-topbar">
                        <div className="forecast-topbar-inner">
                            <div className="forecast-topbar-brand" title={FCST_APP_TITLE}>
                                <div className="forecast-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="forecast-topbar-title">{FCST_APP_TITLE}</span>
                            </div>

                            <nav className="forecast-topnav" aria-label="FCST 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "forecast-topnav-link active"
                                                : "forecast-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="forecast-topbar-actions">
                                <ForecastAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="forecast-page">
                        <Outlet />
                    </div>
                </div>
                <ForecastAgentDockPanel />
            </div>
        </ForecastAgentDockProvider>
    );
}
