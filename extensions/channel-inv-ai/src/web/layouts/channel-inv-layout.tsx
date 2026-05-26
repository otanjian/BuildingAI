import { Activity } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import {
    ChannelInvAgentDockPanel,
    ChannelInvAgentDockProvider,
    ChannelInvAgentTopbarToggle,
} from "../components/channel-inv-agent-float-embed";
import "../styles/channel_inv.css";

const NAV = [
    { to: "dashboard", label: "驾驶舱" },
    { to: "rules", label: "检查规则" },
    { to: "anomalies", label: "异常明细" },
    { to: "settings", label: "设置" },
] as const;

/** Application name in the top bar. */
export const CHI_APP_TITLE = "渠道库存协同自治助手应用";

export function ChannelInvLayout() {
    return (
        <ChannelInvAgentDockProvider>
            <div className="channel-inv-root channel-inv-root--with-agent-slot" data-channel-inv-shell>
                <div className="channel-inv-main">
                    <header className="channel-inv-topbar">
                        <div className="channel-inv-topbar-inner">
                            <div className="channel-inv-topbar-brand" title={CHI_APP_TITLE}>
                                <div className="channel-inv-topbar-logo" aria-hidden>
                                    <Activity size={18} strokeWidth={2.25} />
                                </div>
                                <span className="channel-inv-topbar-title">{CHI_APP_TITLE}</span>
                            </div>

                            <nav className="channel-inv-topnav" aria-label="CHI 页面导航">
                                {NAV.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            isActive
                                                ? "channel-inv-topnav-link active"
                                                : "channel-inv-topnav-link"
                                        }
                                        end={item.to === "dashboard"}
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="channel-inv-topbar-actions">
                                <ChannelInvAgentTopbarToggle />
                            </div>
                        </div>
                    </header>
                    <div className="channel-inv-page">
                        <Outlet />
                    </div>
                </div>
                <ChannelInvAgentDockPanel />
            </div>
        </ChannelInvAgentDockProvider>
    );
}
