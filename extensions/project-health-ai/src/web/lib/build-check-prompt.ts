import type { CheckRuleDto } from "../services/rules";

export function buildCheckPrompt(rule: CheckRuleDto, index?: number, total?: number): string {
    const progress =
        index != null && total != null ? `[${index}/${total}] ` : "";
    return [
        `${progress}请执行以下**单条**检查规则（完成后仅输出该条的 JSON，不要处理其他规则）：`,
        "",
        `规则ID: ${rule.ruleId}`,
        `业务域: ${rule.businessDomain}`,
        `数据项目: ${rule.dataItem}`,
        `检查规则: ${rule.ruleDescription}`,
        `严重程度: ${rule.severity}`,
        `扣分: ${rule.deductScore}`,
        `允许自动修复: ${rule.autoFix ? "是" : "否"}`,
        "",
        "通过 MCP 从 ERP 取数并校验。完成后仅输出一个 JSON 对象（可放在 ```json 代码块中）：",
        '{"ruleId":"' +
            rule.ruleId +
            '","anomalies":[{"anomalyId":"ANOM-YYYYMMDD-001","description":"...","riskLevel":"高|中|低","rootCauseAnalysis":"...","solution":"...","status":"待解决|已解决|ai自动修复","autoFixed":false}]}',
        "若无异常，anomalies 必须为 []。JSON 之外不要输出其他文字。",
    ].join("\n");
}
