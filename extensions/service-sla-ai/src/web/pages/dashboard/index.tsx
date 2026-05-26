import { EnterpriseDashboard, EnterpriseDashboardLoading } from "@buildingai/extension-dashboard";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getDashboardOverview, type DashboardOverview } from "../../services/dashboard";

const APP_ID = "service-sla-ai";

export default function DashboardPage() {
    const [data, setData] = useState<DashboardOverview | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const overview = await getDashboardOverview();
            setData(overview);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading && !data) {
        return <EnterpriseDashboardLoading message="加载驾驶舱…" />;
    }

    if (!data) {
        return (
            <EnterpriseDashboardLoading message="暂无数据，请稍后重试" />
        );
    }

    return <EnterpriseDashboard appId={APP_ID} data={data} />;
}
