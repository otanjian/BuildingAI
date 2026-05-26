import { defineRouteOption } from "@buildingai/web-core";

import { QualityRcaLayout } from "./layouts/quality-rca-layout";

const EXTENSION_ID = "quality-rca-ai";
import AnomaliesPage from "./pages/anomalies";
import DashboardPage from "./pages/dashboard";
import RulesPage from "./pages/rules";
import SettingsPage from "./pages/settings";

export const routeOption = defineRouteOption({
    base: `extension/${EXTENSION_ID}`,
    identifier: EXTENSION_ID,
    routes: [
        {
            element: <QualityRcaLayout />,
            children: [
                { index: true, element: <DashboardPage /> },
                { path: "dashboard", element: <DashboardPage /> },
                { path: "rules", element: <RulesPage /> },
                { path: "anomalies", element: <AnomaliesPage /> },
                { path: "settings", element: <SettingsPage /> },
            ],
        },
    ],
    consoleMenus: [
        {
            title: "QUALITY-RCA-AI",
            path: "/",
            icon: "activity",
        },
    ],
    consoleRoutes: [{ index: true, element: <DashboardPage /> }],
});
