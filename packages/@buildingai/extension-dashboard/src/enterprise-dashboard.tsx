import { getEnterpriseDashboardConfig } from "@buildingai/constants/shared/enterprise-dashboard.constant";

import "./theme/dashboard-base.css";
import { renderDashboardTemplate } from "./cockpit/templates";
import { buildDashboardThemeVars } from "./theme/build-theme-vars";
import type { DashboardOverview } from "./types";

export type EnterpriseDashboardProps = {
    appId: string;
    data: DashboardOverview;
};

export function EnterpriseDashboard({ appId, data }: EnterpriseDashboardProps) {
    const config = getEnterpriseDashboardConfig(appId);
    if (!config) {
        return (
            <div className="dash-loading">
                未找到应用驾驶舱配置（{appId}）
            </div>
        );
    }

    const themeStyle = buildDashboardThemeVars(config.hue);
    const templateClass = `dash-template--${config.template}`;

    return (
        <div className={`dash ${templateClass}`} style={themeStyle} data-app-id={appId}>
            {renderDashboardTemplate({ data, config })}
        </div>
    );
}

export function EnterpriseDashboardLoading({ message = "加载驾驶舱…" }: { message?: string }) {
    return <div className="dash-loading">{message}</div>;
}
