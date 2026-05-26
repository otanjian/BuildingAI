import type { CheckResultDto } from "../services/anomalies";

export function buildRcaPrompt(anomaly: CheckResultDto): string {
    return [
        "请对该异常进行深度根因分析，可分步骤说明：获取 ERP 上下文、识别异常、跨模块关联、给出根因与修复建议。",
        "",
        `异常ID: ${anomaly.anomalyId}`,
        `规则ID: ${anomaly.ruleId}`,
        `描述: ${anomaly.description}`,
        `风险: ${anomaly.riskLevel}`,
        `已有根因: ${anomaly.rootCause ?? "无"}`,
        `已有方案: ${anomaly.solution ?? "无"}`,
    ].join("\n");
}
