import { downloadAuditExport, useAuditDashboardQuery } from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent, CardHeader } from "@buildingai/ui/components/ui/card";
import { Input } from "@buildingai/ui/components/ui/input";
import { useState } from "react";

import { PageContainer } from "@/layouts/console/_components/page-container";

export default function AuditDashboardPage() {
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const query = useAuditDashboardQuery({ keyword: keyword || undefined, page, pageSize: 20 });
    const data = query.data;
    const exportData = async () => {
        const payload = await downloadAuditExport();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = "audit-export-redacted.json"; anchor.click();
        URL.revokeObjectURL(url);
    };
    return <PageContainer>
        <div className="space-y-6">
            <div><h1 className="text-2xl font-semibold">审计与成本治理</h1><p className="text-muted-foreground mt-1 text-sm">按租户查看脱敏审计事件、延迟告警与成本账本。</p></div>
            <div className="grid gap-4 md:grid-cols-4">
                {[['事件总数', data?.summary.total ?? 0], ['拒绝数', data?.summary.denied ?? 0], ['失败数', data?.summary.failed ?? 0], ['已结算成本', data?.cost.settled?.toFixed(4) ?? '0.0000']].map(([label, value]) => <Card key={String(label)}><CardHeader className="pb-2 text-sm text-muted-foreground">{label}</CardHeader><CardContent className="text-2xl font-semibold">{value}</CardContent></Card>)}
            </div>
            <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-semibold">审计事件</span><div className="flex gap-2"><Input aria-label="搜索审计事件" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder="搜索 action、结果或请求 ID" /><Button variant="outline" onClick={() => query.refetch()}>刷新</Button><Button variant="outline" onClick={exportData}>导出脱敏数据</Button></div></div></CardHeader><CardContent>
                {query.isLoading ? <p className="text-muted-foreground text-sm">加载中…</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">时间</th><th className="p-2">操作</th><th className="p-2">结果</th><th className="p-2">请求 ID</th><th className="p-2">延迟</th></tr></thead><tbody>{(data?.items ?? []).map((item) => <tr className="border-b" key={item.id}><td className="p-2">{new Date(item.createdAt).toLocaleString()}</td><td className="p-2">{item.action}</td><td className="p-2">{item.outcome}</td><td className="p-2 font-mono text-xs">{item.requestId}</td><td className="p-2">{item.latencyMs} ms</td></tr>)}</tbody></table></div>}
                <div className="mt-4 flex items-center justify-between"><span className="text-muted-foreground text-xs">共 {data?.total ?? 0} 条，p95 {data?.summary.p95LatencyMs ?? 0} ms</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={!data || page * data.pageSize >= data.total} onClick={() => setPage((value) => value + 1)}>下一页</Button></div></div>
            </CardContent></Card>
        </div>
    </PageContainer>;
}
