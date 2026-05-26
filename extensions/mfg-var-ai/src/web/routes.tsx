import { defineRouteOption } from "@buildingai/web-core";

import { MfgVarLayout } from "./layouts/mfg-var-layout";

const EXTENSION_ID = "mfg-var-ai";
import AnomaliesPage from "./pages/anomalies";
import DashboardPage from "./pages/dashboard";
import RulesPage from "./pages/rules";
import SettingsPage from "./pages/settings";

export const routeOption = defineRouteOption({
    base: `extension/${EXTENSION_ID}`,
    identifier: EXTENSION_ID,
    routes: [
        {
            element: <MfgVarLayout />,
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
            title: "MFG-VAR-AI",
            path: "/",
            icon: "activity",
        },
    ],
    consoleRoutes: [{ index: true, element: <DashboardPage /> }],
});
