import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    TaxComplianceAgentDockPanel,
    TaxComplianceAgentDockProvider,
    TaxComplianceAgentTopbarToggle,
} from "../components/tax-compliance-agent-float-embed";
import "../styles/tax_compliance.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const TAX_APP_TITLE = "税务合规自治助手应用";

export function TaxComplianceLayout() {
    return (
        <TaxComplianceAgentDockProvider>
            <div className="tax-compliance-root tax-compliance-root--with-agent-slot" data-tax-compliance-shell>
                <div className="tax-compliance-main">
                    <header className="tax-compliance-topbar">
                        <div className="tax-compliance-topbar-inner">
                            <div className="tax-compliance-topbar-brand" title={TAX_APP_TITLE}>
                                <div className="tax-compliance-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="tax-compliance-topbar-title">{TAX_APP_TITLE}</span>
                            </div>

                            <nav className="tax-compliance-topnav" aria-label="TAX 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "tax-compliance-topnav-link active"
                                                : "tax-compliance-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="tax-compliance-topbar-actions">
                                <TaxComplianceAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="tax-compliance-page">
                        <Outlet />
                    </div>
                </div>
                <TaxComplianceAgentDockPanel />
            </div>
        </TaxComplianceAgentDockProvider>
    );
}
