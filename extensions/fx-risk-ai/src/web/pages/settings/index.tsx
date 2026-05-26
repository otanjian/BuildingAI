import { listMyAgents, updatePublishConfig } from "@buildingai/services/web";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { FXR_PLATFORM_AGENT_NAME } from "../../constants";
import { provisionFxRiskAgentViaPlatform } from "../../lib/provision-fx-risk-agent";
import {
    getAgentUpdatePreview,
    getSettings,
    updateSettings,
    type AgentOptionRow,
    type AgentUpdatePreviewDto,
} from "../../services/settings";

export default function SettingsPage() {
    const [agentId, setAgentId] = useState("");
    const [agentOptions, setAgentOptions] = useState<AgentOptionRow[]>([]);
    const [preview, setPreview] = useState<AgentUpdatePreviewDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [provisioning, setProvisioning] = useState(false);
    const autoProvisionStarted = useRef(false);

    const load = useCallback(async () => {
        try {
            const [s, mine, p] = await Promise.all([
                getSettings(),
                listMyAgents({ page: 1, pageSize: 100 }),
                getAgentUpdatePreview(),
            ]);
            setAgentId(s.agentId ?? "");
            setAgentOptions(mine.items.map((a) => ({ id: a.id, name: a.name })));
            setPreview(p);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "加载设置失败");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const hasFxRiskAgent = agentOptions.some((a) => a.name === FXR_PLATFORM_AGENT_NAME);

    const handleProvision = useCallback(async () => {
        setProvisioning(true);
        try {
            const { agentId: id, created } = await provisionFxRiskAgentViaPlatform();
            setAgentId(id);
            toast.success(
                created
                    ? `已创建「${FXR_PLATFORM_AGENT_NAME}」并注册 fx-risk-mcp`
                    : `已更新「${FXR_PLATFORM_AGENT_NAME}」`,
            );
            await load();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "更新智能体失败");
        } finally {
            setProvisioning(false);
        }
    }, [load]);

    useEffect(() => {
        if (loading || hasFxRiskAgent || autoProvisionStarted.current) {
            return;
        }
        autoProvisionStarted.current = true;
        void handleProvision();
    }, [loading, hasFxRiskAgent, handleProvision]);

    if (loading || (provisioning && !hasFxRiskAgent)) {
        return (
            <div className="fx-risk-card" style={{ padding: 20, maxWidth: 640 }}>
                <p style={{ fontSize: 13, color: "#64748b" }}>
                    {provisioning ? "正在更新 FXR 智能体（fx-risk-mcp + 角色配置）…" : "加载中…"}
                </p>
            </div>
        );
    }

    const ehcsMcp = preview?.mcpServers.find((m) => m.role === "ehcs");
    const erpMcp = preview?.mcpServers.find((m) => m.role === "erp");

    return (
        <div className="fx-risk-card" style={{ padding: 20, maxWidth: 640 }}>
            <h2 style={{ fontSize: 14, marginBottom: 16 }}>应用设置</h2>

            {!hasFxRiskAgent ? (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 12,
                        borderRadius: 8,
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        fontSize: 12,
                    }}
                >
                    <p style={{ marginBottom: 8 }}>未检测到「{FXR_PLATFORM_AGENT_NAME}」智能体。</p>
                    <button
                        type="button"
                        className="fx-risk-btn fx-risk-btn-primary"
                        disabled={provisioning}
                        onClick={() => void handleProvision()}
                    >
                        {provisioning ? "更新中…" : "更新 FXR 智能体"}
                    </button>
                </div>
            ) : (
                <p style={{ fontSize: 12, color: "#059669", marginBottom: 12 }}>
                    已检测到「{FXR_PLATFORM_AGENT_NAME}」。可在平台
                    <strong> 智能体 → 我的智能体 </strong>
                    中查看；点击下方按钮可同步最新 PRD 配置与 fx-risk-mcp 工具。
                </p>
            )}

            <div className="fx-risk-form-row">
                <label>智能体</label>
                <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                    <option value="">请选择</option>
                    {agentOptions.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.name}
                        </option>
                    ))}
                </select>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                    保存后将开启 WebAPP 发布，供右侧智能体栏 iframe（/agents/智能体ID/访问令牌）使用。
                </span>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, marginBottom: 20 }}>
                <button
                    type="button"
                    className="fx-risk-btn fx-risk-btn-primary"
                    onClick={async () => {
                        if (!agentId) {
                            toast.error("请选择智能体");
                            return;
                        }
                        try {
                            await updateSettings({ agentId });
                            await updatePublishConfig(agentId, { enableSite: true });
                            toast.success("已保存");
                        } catch (e) {
                            toast.error(e instanceof Error ? e.message : "保存失败");
                        }
                    }}
                >
                    保存
                </button>
                <button
                    type="button"
                    className="fx-risk-btn fx-risk-btn-outline"
                    disabled={provisioning}
                    onClick={() => void handleProvision()}
                >
                    {provisioning ? "更新中…" : "更新 FXR 智能体"}
                </button>
            </div>

            {preview ? (
                <section
                    style={{
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: 16,
                        fontSize: 12,
                    }}
                    aria-label="更新预览"
                >
                    <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                        将同步到智能体的内容
                    </h3>

                    <dl style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                        <div>
                            <dt style={{ color: "#64748b", marginBottom: 2 }}>名称</dt>
                            <dd>{preview.agentName}</dd>
                        </div>
                        <div>
                            <dt style={{ color: "#64748b", marginBottom: 2 }}>描述</dt>
                            <dd>{preview.description}</dd>
                        </div>
                        <div>
                            <dt style={{ color: "#64748b", marginBottom: 2 }}>最大工具步数</dt>
                            <dd>{preview.maxSteps}</dd>
                        </div>
                        <div>
                            <dt style={{ color: "#64748b", marginBottom: 2 }}>开场白</dt>
                            <dd>{preview.openingStatement}</dd>
                        </div>
                        <div>
                            <dt style={{ color: "#64748b", marginBottom: 2 }}>建议问题</dt>
                            <dd>{preview.openingQuestions.join(" · ")}</dd>
                        </div>
                        <div>
                            <dt style={{ color: "#64748b", marginBottom: 2 }}>侧栏嵌入（WebAPP）</dt>
                            <dd style={{ wordBreak: "break-all" }}>
                                {preview.publishEmbedUrl ??
                                    "更新并保存后将生成 /agents/{agentId}/{accessToken} 供右侧 iframe 使用"}
                            </dd>
                        </div>
                    </dl>

                    <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>绑定的 MCP</h4>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "grid", gap: 12 }}>
                        {ehcsMcp ? (
                            <li
                                style={{
                                    padding: 12,
                                    borderRadius: 8,
                                    border: "1px solid #bfdbfe",
                                    background: "#f8fafc",
                                }}
                            >
                                <strong>{ehcsMcp.name}</strong>
                                <span style={{ marginLeft: 8, color: "#64748b", fontSize: 11 }}>
                                    内置检查编排
                                </span>
                                <p
                                    style={{
                                        margin: "6px 0 0",
                                        fontSize: 11,
                                        color: "#64748b",
                                        wordBreak: "break-all",
                                    }}
                                >
                                    {ehcsMcp.url}
                                </p>
                                {ehcsMcp.tools?.length ? (
                                    <table
                                        style={{
                                            width: "100%",
                                            marginTop: 10,
                                            borderCollapse: "collapse",
                                            fontSize: 11,
                                        }}
                                    >
                                        <thead>
                                            <tr style={{ textAlign: "left", color: "#64748b" }}>
                                                <th style={{ padding: "4px 8px 4px 0" }}>工具</th>
                                                <th style={{ padding: "4px 0" }}>说明</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ehcsMcp.tools.map((t) => (
                                                <tr key={t.name}>
                                                    <td
                                                        style={{
                                                            padding: "4px 8px 4px 0",
                                                            fontFamily: "monospace",
                                                            verticalAlign: "top",
                                                        }}
                                                    >
                                                        {t.name}
                                                    </td>
                                                    <td style={{ padding: "4px 0", color: "#334155" }}>
                                                        {t.description}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : null}
                            </li>
                        ) : null}
                        {erpMcp ? (
                            <li
                                style={{
                                    padding: 12,
                                    borderRadius: 8,
                                    border: "1px solid #e2e8f0",
                                }}
                            >
                                <strong>{erpMcp.name}</strong>
                                <span style={{ marginLeft: 8, color: "#64748b", fontSize: 11 }}>
                                    ERP 业务数据
                                </span>
                                <p
                                    style={{
                                        margin: "6px 0 0",
                                        fontSize: 11,
                                        color: "#64748b",
                                        wordBreak: "break-all",
                                    }}
                                >
                                    {erpMcp.url}
                                </p>
                            </li>
                        ) : (
                            <li style={{ color: "#b45309", fontSize: 11 }}>
                                未检测到 ERP MCP：请先在控制台配置 ERPNext/SAP 等 MCP，再点击「更新
                                FXR 智能体」。
                            </li>
                        )}
                    </ul>

                    <details>
                        <summary style={{ cursor: "pointer", color: "#64748b" }}>
                            角色提示词（全文）
                        </summary>
                        <pre
                            style={{
                                marginTop: 8,
                                padding: 12,
                                borderRadius: 8,
                                background: "#f1f5f9",
                                fontSize: 11,
                                whiteSpace: "pre-wrap",
                                maxHeight: 240,
                                overflow: "auto",
                            }}
                        >
                            {preview.rolePrompt}
                        </pre>
                    </details>
                </section>
            ) : null}
        </div>
    );
}
