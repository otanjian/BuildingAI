/** Catalog version — bump when rule set changes. */
export const APO_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type ApOptCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const APO_CHECK_RULES_CATALOG: ApOptCheckRuleCatalogEntry[] = [
    {
        ruleId: "AP_001",
        businessDomain: "付款优化",
        dataItem: "付款优化检查项1",
        ruleDescription:
            "针对付款优化：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "AP_002",
        businessDomain: "付款优化",
        dataItem: "付款优化检查项2",
        ruleDescription:
            "针对付款优化：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "AP_003",
        businessDomain: "付款优化",
        dataItem: "付款优化检查项3",
        ruleDescription:
            "针对付款优化：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "AP_004",
        businessDomain: "付款优化",
        dataItem: "付款优化检查项4",
        ruleDescription:
            "针对付款优化：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AP_005",
        businessDomain: "付款优化",
        dataItem: "付款优化检查项5",
        ruleDescription:
            "针对付款优化：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AP_006",
        businessDomain: "付款优化",
        dataItem: "付款优化检查项6",
        ruleDescription:
            "针对付款优化：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AP_007",
        businessDomain: "付款优化",
        dataItem: "付款优化检查项7",
        ruleDescription:
            "针对付款优化：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AP_008",
        businessDomain: "付款优化",
        dataItem: "付款优化检查项8",
        ruleDescription:
            "针对付款优化：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "AP_009",
        businessDomain: "三单匹配",
        dataItem: "三单匹配检查项1",
        ruleDescription:
            "针对三单匹配：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "AP_010",
        businessDomain: "三单匹配",
        dataItem: "三单匹配检查项2",
        ruleDescription:
            "针对三单匹配：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "AP_011",
        businessDomain: "三单匹配",
        dataItem: "三单匹配检查项3",
        ruleDescription:
            "针对三单匹配：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AP_012",
        businessDomain: "三单匹配",
        dataItem: "三单匹配检查项4",
        ruleDescription:
            "针对三单匹配：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AP_013",
        businessDomain: "三单匹配",
        dataItem: "三单匹配检查项5",
        ruleDescription:
            "针对三单匹配：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AP_014",
        businessDomain: "三单匹配",
        dataItem: "三单匹配检查项6",
        ruleDescription:
            "针对三单匹配：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AP_015",
        businessDomain: "三单匹配",
        dataItem: "三单匹配检查项7",
        ruleDescription:
            "针对三单匹配：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "AP_016",
        businessDomain: "三单匹配",
        dataItem: "三单匹配检查项8",
        ruleDescription:
            "针对三单匹配：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "AP_017",
        businessDomain: "现金折扣",
        dataItem: "现金折扣检查项1",
        ruleDescription:
            "针对现金折扣：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "AP_018",
        businessDomain: "现金折扣",
        dataItem: "现金折扣检查项2",
        ruleDescription:
            "针对现金折扣：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AP_019",
        businessDomain: "现金折扣",
        dataItem: "现金折扣检查项3",
        ruleDescription:
            "针对现金折扣：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AP_020",
        businessDomain: "现金折扣",
        dataItem: "现金折扣检查项4",
        ruleDescription:
            "针对现金折扣：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AP_021",
        businessDomain: "现金折扣",
        dataItem: "现金折扣检查项5",
        ruleDescription:
            "针对现金折扣：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AP_022",
        businessDomain: "现金折扣",
        dataItem: "现金折扣检查项6",
        ruleDescription:
            "针对现金折扣：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "AP_023",
        businessDomain: "现金折扣",
        dataItem: "现金折扣检查项7",
        ruleDescription:
            "针对现金折扣：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "AP_024",
        businessDomain: "现金折扣",
        dataItem: "现金折扣检查项8",
        ruleDescription:
            "针对现金折扣：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "AP_025",
        businessDomain: "供应商对账",
        dataItem: "供应商对账检查项1",
        ruleDescription:
            "针对供应商对账：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AP_026",
        businessDomain: "供应商对账",
        dataItem: "供应商对账检查项2",
        ruleDescription:
            "针对供应商对账：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AP_027",
        businessDomain: "供应商对账",
        dataItem: "供应商对账检查项3",
        ruleDescription:
            "针对供应商对账：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AP_028",
        businessDomain: "供应商对账",
        dataItem: "供应商对账检查项4",
        ruleDescription:
            "针对供应商对账：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AP_029",
        businessDomain: "供应商对账",
        dataItem: "供应商对账检查项5",
        ruleDescription:
            "针对供应商对账：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "AP_030",
        businessDomain: "供应商对账",
        dataItem: "供应商对账检查项6",
        ruleDescription:
            "针对供应商对账：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "AP_031",
        businessDomain: "供应商对账",
        dataItem: "供应商对账检查项7",
        ruleDescription:
            "针对供应商对账：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "AP_032",
        businessDomain: "供应商对账",
        dataItem: "供应商对账检查项8",
        ruleDescription:
            "针对供应商对账：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应付账款优化自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const APO_CATALOG_MARKER_RULE_ID = "AP_032";
