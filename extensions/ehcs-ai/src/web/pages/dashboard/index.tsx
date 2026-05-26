import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getDashboardOverview, type DashboardOverview } from "../../services/dashboard";
import { DashboardCockpit } from "./dashboard-cockpit";

export default function DashboardPage() {
    const [data, setData] = useState<DashboardOverview | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const overview = await getDashboardOverview();
            setData(overview);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "加载驾驶舱失败");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading && !data) {
        return <div className="ehcs-dash-loading">加载驾驶舱…</div>;
    }

    if (!data) {
        return (
            <div className="ehcs-dash-loading">
                暂无数据
                <button type="button" className="ehcs-btn ehcs-btn-primary" onClick={() => void load()}>
                    重试
                </button>
            </div>
        );
    }

    return <DashboardCockpit data={data} />;
}
