import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { RuleEditModal } from "../../components/rule-edit-modal";
import { RiskBadge } from "../../components/risk-badge";
import {
    createRule,
    listRules,
    toggleRule,
    updateRule,
    type CheckRuleDto,
} from "../../services/rules";

export default function RulesPage() {
    const [rules, setRules] = useState<CheckRuleDto[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CheckRuleDto | null>(null);

    const load = useCallback(async () => {
        try {
            setRules(await listRules());
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "加载失败");
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>检查规则列表</span>
                <button
                    type="button"
                    className="forecast-btn forecast-btn-primary"
                    onClick={() => {
                        setEditing(null);
                        setModalOpen(true);
                    }}
                >
                    + 新增规则
                </button>
            </div>
            <div className="forecast-card">
                <table className="forecast-table">
                    <thead>
                        <tr>
                            <th>规则ID</th>
                            <th>业务域</th>
                            <th>数据项目</th>
                            <th>检查规则</th>
                            <th>扣分</th>
                            <th>严重</th>
                            <th>自动修复</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map((r) => (
                            <tr key={r.ruleId}>
                                <td>{r.ruleId}</td>
                                <td>{r.businessDomain}</td>
                                <td>{r.dataItem}</td>
                                <td>{r.ruleDescription}</td>
                                <td>{r.deductScore}</td>
                                <td>
                                    <RiskBadge risk={r.severity} />
                                </td>
                                <td>{r.autoFix ? "是" : "否"}</td>
                                <td>{r.enabled ? "启用" : "禁用"}</td>
                                <td>
                                    <button
                                        type="button"
                                        className="forecast-btn forecast-btn-outline"
                                        style={{ marginRight: 4, padding: "2px 8px" }}
                                        onClick={() => {
                                            setEditing(r);
                                            setModalOpen(true);
                                        }}
                                    >
                                        编辑
                                    </button>
                                    <button
                                        type="button"
                                        className="forecast-btn forecast-btn-outline"
                                        style={{ padding: "2px 8px" }}
                                        onClick={async () => {
                                            await toggleRule(r.ruleId);
                                            void load();
                                        }}
                                    >
                                        {r.enabled ? "禁用" : "启用"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <RuleEditModal
                open={modalOpen}
                editing={editing}
                onClose={() => setModalOpen(false)}
                onSave={async (body) => {
                    if (editing) {
                        await updateRule(editing.ruleId, body);
                    } else {
                        await createRule(body);
                    }
                    void load();
                }}
            />
        </>
    );
}
