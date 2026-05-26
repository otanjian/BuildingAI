import { defineRouteOption } from "@buildingai/web-core";

import { HrComplianceLayout } from "./layouts/hr-compliance-layout";

const EXTENSION_ID = "hr-compliance-ai";
import AnomaliesPage from "./pages/anomalies";
import DashboardPage from "./pages/dashboard";
import RulesPage from "./pages/rules";
import SettingsPage from "./pages/settings";

export const routeOption = defineRouteOption({
    base: `extension/${EXTENSION_ID}`,
    identifier: EXTENSION_ID,
    routes: [
        {
            element: <HrComplianceLayout />,
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
            title: "HR-COMPLIANCE-AI",
            path: "/",
            icon: "activity",
        },
    ],
    consoleRoutes: [{ index: true, element: <DashboardPage /> }],
});
