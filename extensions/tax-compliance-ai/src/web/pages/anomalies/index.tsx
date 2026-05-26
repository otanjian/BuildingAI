import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { RcaModal } from "../../components/rca-modal";
import { RiskBadge } from "../../components/risk-badge";
import { formatTaxComplianceDateTime } from "../../lib/format-datetime";
import { getAnomaly, listAnomalies, type CheckResultDto } from "../../services/anomalies";
import { getSettings } from "../../services/settings";

export default function AnomaliesPage() {
    const [rows, setRows] = useState<CheckResultDto[]>([]);
    const [risk, setRisk] = useState("");
    const [status, setStatus] = useState("");
    const [rcaTarget, setRcaTarget] = useState<CheckResultDto | null>(null);
    const [agentId, setAgentId] = useState("");

    const load = useCallback(async () => {
        try {
            setRows(
                await listAnomalies({
                    risk: risk || undefined,
                    status: status || undefined,
                }),
            );
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        }
    }, [risk, status]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        void getSettings().then((s) => {
            setAgentId(s.agentId ?? "");
        });
    }, []);

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>异常明细</span>
                <div style={{ display: "flex", gap: 8 }}>
                    <select value={risk} onChange={(e) => setRisk(e.target.value)}>
                        <option value="">全部风险</option>
                        <option value="高">高</option>
                        <option value="中">中</option>
                        <option value="低">低</option>
                    </select>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">全部状态</option>
                        <option value="待解决">待解决</option>
                        <option value="已解决">已解决</option>
                        <option value="ai自动修复">ai自动修复</option>
                    </select>
                </div>
            </div>
            <div className="tax-compliance-card">
                <table className="tax-compliance-table">
                    <thead>
                        <tr>
                            <th>异常ID</th>
                            <th>规则</th>
                            <th>描述</th>
                            <th>风险</th>
                            <th>根因</th>
                            <th>方案</th>
                            <th>状态</th>
                            <th>检查时间</th>
                            <th>创建时间</th>
                            <th>解决时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((a) => (
                            <tr key={a.anomalyId}>
                                <td>{a.anomalyId}</td>
                                <td>{a.ruleId}</td>
                                <td>{a.description}</td>
                                <td>
                                    <RiskBadge risk={a.riskLevel} />
                                </td>
                                <td>{a.rootCause}</td>
                                <td>{a.solution}</td>
                                <td>{a.status}</td>
                                <td>{formatTaxComplianceDateTime(a.checkTime)}</td>
                                <td>{formatTaxComplianceDateTime(a.createTime)}</td>
                                <td>{formatTaxComplianceDateTime(a.resolvedAt)}</td>
                                <td>
                                    <button
                                        type="button"
                                        className="tax-compliance-btn tax-compliance-btn-primary"
                                        style={{ padding: "2px 10px", fontSize: 10 }}
                                        onClick={async () => {
                                            setRcaTarget(await getAnomaly(a.anomalyId));
                                        }}
                                    >
                                        根因分析
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <RcaModal anomaly={rcaTarget} agentId={agentId} onClose={() => setRcaTarget(null)} />
        </>
    );
}
