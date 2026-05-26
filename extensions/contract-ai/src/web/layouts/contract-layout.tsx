import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    ContractAgentDockPanel,
    ContractAgentDockProvider,
    ContractAgentTopbarToggle,
} from "../components/contract-agent-float-embed";
import "../styles/contract.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const CTR_APP_TITLE = "合同履约自治助手应用";

export function ContractLayout() {
    return (
        <ContractAgentDockProvider>
            <div className="contract-root contract-root--with-agent-slot" data-contract-shell>
                <div className="contract-main">
                    <header className="contract-topbar">
                        <div className="contract-topbar-inner">
                            <div className="contract-topbar-brand" title={CTR_APP_TITLE}>
                                <div className="contract-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="contract-topbar-title">{CTR_APP_TITLE}</span>
                            </div>

                            <nav className="contract-topnav" aria-label="CTR 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "contract-topnav-link active"
                                                : "contract-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="contract-topbar-actions">
                                <ContractAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="contract-page">
                        <Outlet />
                    </div>
                </div>
                <ContractAgentDockPanel />
            </div>
        </ContractAgentDockProvider>
    );
}
