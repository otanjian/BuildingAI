/**
 * Per-app app-center card copy (~40–48 chars) and agent plaza descriptions.
 * Avoid shared templates like「全量检查、异常预警、根因会话」.
 */

/** @type {Record<string, string>} */
export const APP_CENTER_DESCRIPTION_BY_APP = {
    "ehcs-ai":
        "跨模块 ERP 数据健康巡检：规则驱动检查、异常落库与交互式根因分析。",
    "inv-opt-ai":
        "安全库存与 ABC 物料分析，识别缺货与高库存，辅助补货与安全库存参数优化。",
    "channel-inv-ai":
        "渠道库存与调拨协同监控，预警渠道积压、断货与跨仓库存差异。",
    "otif-ai":
        "订单 OTIF 与发运准时率跟踪，定位延误、短装与承运环节异常。",
    "proc-audit-ai":
        "采购价与供应商合规审查，识别价格偏离、围标风险与三单不匹配。",
    "mdm-quality-ai":
        "主数据唯一性与必填完整性治理，批量修复客商、物料与 BOM 缺陷。",
    "quality-rca-ai":
        "批次追溯与客诉质量闭环，关联检验、工单与退换货根因分析。",
    "tax-compliance-ai":
        "税率、申报要素与进项抵扣链校验，提示税务缺口与申报风险。",
    "hr-compliance-ai":
        "薪酬、社保与用工合规巡检，预警加班超限、合同到期与公积金异常。",
    "ar-risk-ai":
        "应收账龄与信用超限监控，分级坏账风险并辅助催收策略分析。",
    "ap-opt-ai":
        "应付三单匹配与付款节奏优化，发现重复付款与提前/延迟付款机会。",
    "fx-risk-ai":
        "多币种敞口与汇兑损益监控，预警汇率陈旧与对冲缺口（不自动交易）。",
    "budget-control-ai":
        "预算占用与无预算支出台账，按部门预警超支并给出冻结建议。",
    "mfg-var-ai":
        "工单标准与实际耗用偏差分析，定位 BOM、报工与在制品成本异常。",
    "forecast-ai":
        "销售预测 MAPE 与需求偏差校准，滚动修正预测模型与安全库存参数。",
    "asset-life-ai":
        "固定资产账实、折旧与处置合规，提示闲置、减值与调拨异常。",
    "project-health-ai":
        "项目进度、成本与里程碑健康度，预警延误、超支与资源冲突。",
    "contract-ai":
        "合同到期、履约节点与回款跟踪，识别违约、续签与里程碑风险。",
    "service-sla-ai":
        "售后响应与一次修复率巡检，预警 P1 超时、备件缺货与重复维修。",
    "energy-carbon-ai":
        "能耗与碳排强度对标，发现异常表计、班次与产线超标。",
    "esg-report-ai":
        "ESG 披露指标缺口与证据链校验，按域辅助编报周期与完整性。",
};

/** @type {Record<string, string>} */
export const AGENT_DESCRIPTION_BY_APP = {
    "ehcs-ai":
        "面向企业 ERP 全模块数据健康，提供规则驱动检查、MCP 逐条校验、结构化落库与根因会话，支持低风险字段自动修复建议。",
    "inv-opt-ai":
        "库存优化场景：安全库存、ABC 分类与缺货风险规则，支持补货参数建议与缺货根因分析。",
    "channel-inv-ai":
        "渠道库存协同：调拨、渠道仓与销售预测对齐，识别渠道积压与断货风险。",
    "otif-ai":
        "供应链交付：OTIF、发运与承运节点监控，定位延误与短装根因。",
    "proc-audit-ai":
        "采购合规：价格异常、供应商资质与 PO/收货/发票三单匹配审查。",
    "mdm-quality-ai":
        "主数据质量：唯一性、必填与参照完整性，支持批量修复建议。",
    "quality-rca-ai":
        "质量追溯：批次、检验与客诉关联，支持 RCA 与纠正措施跟踪。",
    "tax-compliance-ai":
        "税务合规：税率、申报表与抵扣链校验，输出缺口清单与修复建议。",
    "hr-compliance-ai":
        "人力合规：薪酬、社保、加班与合同到期规则巡检。",
    "ar-risk-ai":
        "应收风控：账龄、信用额度与催收优先级，辅助回款策略分析。",
    "ap-opt-ai":
        "应付优化：三单匹配、付款窗口与折扣机会识别。",
    "fx-risk-ai":
        "外汇风险：敞口、汇兑损益与汇率时效监控；仅报告与对冲建议，不自动交易。",
    "budget-control-ai":
        "预算执行：占用率、无预算支出与部门超支预警。",
    "mfg-var-ai":
        "生产成本：标准 vs 实际耗用、工单偏差与在制品异常分析。",
    "forecast-ai":
        "需求预测：MAPE 校准、偏差诊断与预测参数滚动修正。",
    "asset-life-ai":
        "资产全生命周期：账实、折旧、闲置与处置合规。",
    "project-health-ai":
        "项目交付：进度、成本、里程碑与资源负荷健康分析。",
    "contract-ai":
        "合同履约：到期、SLA、回款节点与违约风险跟踪。",
    "service-sla-ai":
        "售后 SLA：响应/解决时效、一次修复率与备件可用性巡检。",
    "energy-carbon-ai":
        "能源碳排：能耗强度、碳因子与站点/产线超标预警。",
    "esg-report-ai":
        "ESG 披露：指标缺口、证据链与编报周期域别完整性。",
};
