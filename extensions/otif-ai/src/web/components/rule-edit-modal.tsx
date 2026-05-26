import { useEffect, useState } from "react";

import type { CheckRuleDto } from "../services/rules";

type FormState = {
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: string;
    autoFix: boolean;
    enabled: boolean;
};

const DEFAULT: FormState = {
    businessDomain: "财务数据",
    dataItem: "",
    ruleDescription: "",
    deductScore: 10,
    severity: "中",
    autoFix: false,
    enabled: true,
};

type Props = {
    open: boolean;
    editing: CheckRuleDto | null;
    onClose: () => void;
    onSave: (body: FormState) => Promise<void>;
};

export function RuleEditModal({ open, editing, onClose, onSave }: Props) {
    const [form, setForm] = useState<FormState>(DEFAULT);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                businessDomain: editing.businessDomain,
                dataItem: editing.dataItem,
                ruleDescription: editing.ruleDescription,
                deductScore: editing.deductScore,
                severity: editing.severity,
                autoFix: editing.autoFix,
                enabled: editing.enabled,
            });
        } else {
            setForm(DEFAULT);
        }
    }, [open, editing]);

    if (!open) return null;

    return (
        <div className="otif-modal-backdrop" onClick={onClose}>
            <div className="otif-modal" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginBottom: 16 }}>{editing ? "编辑检查规则" : "新增检查规则"}</h3>
                <div className="otif-form-row">
                    <label>业务域</label>
                    <select
                        value={form.businessDomain}
                        onChange={(e) => setForm({ ...form, businessDomain: e.target.value })}
                    >
                        <option value="财务数据">财务数据</option>
                        <option value="供应链">供应链</option>
                        <option value="供应链数据">供应链数据（旧）</option>
                        <option value="合作伙伴">合作伙伴</option>
                    </select>
                </div>
                <div className="otif-form-row">
                    <label>数据项目</label>
                    <input
                        value={form.dataItem}
                        onChange={(e) => setForm({ ...form, dataItem: e.target.value })}
                    />
                </div>
                <div className="otif-form-row">
                    <label>检查规则</label>
                    <textarea
                        rows={3}
                        value={form.ruleDescription}
                        onChange={(e) => setForm({ ...form, ruleDescription: e.target.value })}
                    />
                </div>
                <div className="otif-form-row">
                    <label>扣分 (1-100)</label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={form.deductScore}
                        onChange={(e) =>
                            setForm({ ...form, deductScore: Number(e.target.value) || 10 })
                        }
                    />
                </div>
                <div className="otif-form-row">
                    <label>严重程度</label>
                    <select
                        value={form.severity}
                        onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    >
                        <option value="低">低</option>
                        <option value="中">中</option>
                        <option value="高">高</option>
                    </select>
                </div>
                <div className="otif-form-row">
                    <label>是否 AI 自动修复</label>
                    <select
                        value={form.autoFix ? "true" : "false"}
                        onChange={(e) => setForm({ ...form, autoFix: e.target.value === "true" })}
                    >
                        <option value="false">否</option>
                        <option value="true">是</option>
                    </select>
                </div>
                <div className="otif-form-row">
                    <label>是否启用</label>
                    <select
                        value={form.enabled ? "true" : "false"}
                        onChange={(e) => setForm({ ...form, enabled: e.target.value === "true" })}
                    >
                        <option value="true">是</option>
                        <option value="false">否</option>
                    </select>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" className="otif-btn otif-btn-outline" onClick={onClose}>
                        取消
                    </button>
                    <button
                        type="button"
                        className="otif-btn otif-btn-primary"
                        disabled={saving}
                        onClick={async () => {
                            if (!form.dataItem.trim() || !form.ruleDescription.trim()) return;
                            setSaving(true);
                            try {
                                await onSave(form);
                                onClose();
                            } finally {
                                setSaving(false);
                            }
                        }}
                    >
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
}
