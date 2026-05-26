/** Catalog version — bump when rule set changes. */
export const ARR_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type ArRiskCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const ARR_CHECK_RULES_CATALOG: ArRiskCheckRuleCatalogEntry[] = [
    {
        ruleId: "AR_001",
        businessDomain: "账龄",
        dataItem: "账龄检查项1",
        ruleDescription:
            "针对账龄：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "AR_002",
        businessDomain: "账龄",
        dataItem: "账龄检查项2",
        ruleDescription:
            "针对账龄：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "AR_003",
        businessDomain: "账龄",
        dataItem: "账龄检查项3",
        ruleDescription:
            "针对账龄：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "AR_004",
        businessDomain: "账龄",
        dataItem: "账龄检查项4",
        ruleDescription:
            "针对账龄：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AR_005",
        businessDomain: "账龄",
        dataItem: "账龄检查项5",
        ruleDescription:
            "针对账龄：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AR_006",
        businessDomain: "账龄",
        dataItem: "账龄检查项6",
        ruleDescription:
            "针对账龄：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AR_007",
        businessDomain: "账龄",
        dataItem: "账龄检查项7",
        ruleDescription:
            "针对账龄：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AR_008",
        businessDomain: "账龄",
        dataItem: "账龄检查项8",
        ruleDescription:
            "针对账龄：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "AR_009",
        businessDomain: "信用额度",
        dataItem: "信用额度检查项1",
        ruleDescription:
            "针对信用额度：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "AR_010",
        businessDomain: "信用额度",
        dataItem: "信用额度检查项2",
        ruleDescription:
            "针对信用额度：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "AR_011",
        businessDomain: "信用额度",
        dataItem: "信用额度检查项3",
        ruleDescription:
            "针对信用额度：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AR_012",
        businessDomain: "信用额度",
        dataItem: "信用额度检查项4",
        ruleDescription:
            "针对信用额度：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AR_013",
        businessDomain: "信用额度",
        dataItem: "信用额度检查项5",
        ruleDescription:
            "针对信用额度：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AR_014",
        businessDomain: "信用额度",
        dataItem: "信用额度检查项6",
        ruleDescription:
            "针对信用额度：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AR_015",
        businessDomain: "信用额度",
        dataItem: "信用额度检查项7",
        ruleDescription:
            "针对信用额度：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "AR_016",
        businessDomain: "信用额度",
        dataItem: "信用额度检查项8",
        ruleDescription:
            "针对信用额度：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "AR_017",
        businessDomain: "回款",
        dataItem: "回款检查项1",
        ruleDescription:
            "针对回款：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "AR_018",
        businessDomain: "回款",
        dataItem: "回款检查项2",
        ruleDescription:
            "针对回款：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AR_019",
        businessDomain: "回款",
        dataItem: "回款检查项3",
        ruleDescription:
            "针对回款：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AR_020",
        businessDomain: "回款",
        dataItem: "回款检查项4",
        ruleDescription:
            "针对回款：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AR_021",
        businessDomain: "回款",
        dataItem: "回款检查项5",
        ruleDescription:
            "针对回款：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AR_022",
        businessDomain: "回款",
        dataItem: "回款检查项6",
        ruleDescription:
            "针对回款：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "AR_023",
        businessDomain: "回款",
        dataItem: "回款检查项7",
        ruleDescription:
            "针对回款：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "AR_024",
        businessDomain: "回款",
        dataItem: "回款检查项8",
        ruleDescription:
            "针对回款：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "AR_025",
        businessDomain: "客户集中度",
        dataItem: "客户集中度检查项1",
        ruleDescription:
            "针对客户集中度：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AR_026",
        businessDomain: "客户集中度",
        dataItem: "客户集中度检查项2",
        ruleDescription:
            "针对客户集中度：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AR_027",
        businessDomain: "客户集中度",
        dataItem: "客户集中度检查项3",
        ruleDescription:
            "针对客户集中度：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AR_028",
        businessDomain: "客户集中度",
        dataItem: "客户集中度检查项4",
        ruleDescription:
            "针对客户集中度：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AR_029",
        businessDomain: "客户集中度",
        dataItem: "客户集中度检查项5",
        ruleDescription:
            "针对客户集中度：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "AR_030",
        businessDomain: "客户集中度",
        dataItem: "客户集中度检查项6",
        ruleDescription:
            "针对客户集中度：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "AR_031",
        businessDomain: "客户集中度",
        dataItem: "客户集中度检查项7",
        ruleDescription:
            "针对客户集中度：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "AR_032",
        businessDomain: "客户集中度",
        dataItem: "客户集中度检查项8",
        ruleDescription:
            "针对客户集中度：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（应收账款风控自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const ARR_CATALOG_MARKER_RULE_ID = "AR_032";
