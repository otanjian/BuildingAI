/** Catalog version — bump when rule set changes. */
export const TAX_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type TaxComplianceCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const TAX_CHECK_RULES_CATALOG: TaxComplianceCheckRuleCatalogEntry[] = [
    {
        ruleId: "TAX_001",
        businessDomain: "销项税",
        dataItem: "销项税检查项1",
        ruleDescription:
            "针对销项税：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "TAX_002",
        businessDomain: "销项税",
        dataItem: "销项税检查项2",
        ruleDescription:
            "针对销项税：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "TAX_003",
        businessDomain: "销项税",
        dataItem: "销项税检查项3",
        ruleDescription:
            "针对销项税：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "TAX_004",
        businessDomain: "销项税",
        dataItem: "销项税检查项4",
        ruleDescription:
            "针对销项税：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "TAX_005",
        businessDomain: "销项税",
        dataItem: "销项税检查项5",
        ruleDescription:
            "针对销项税：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "TAX_006",
        businessDomain: "销项税",
        dataItem: "销项税检查项6",
        ruleDescription:
            "针对销项税：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "TAX_007",
        businessDomain: "销项税",
        dataItem: "销项税检查项7",
        ruleDescription:
            "针对销项税：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "TAX_008",
        businessDomain: "销项税",
        dataItem: "销项税检查项8",
        ruleDescription:
            "针对销项税：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "TAX_009",
        businessDomain: "进项税",
        dataItem: "进项税检查项1",
        ruleDescription:
            "针对进项税：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "TAX_010",
        businessDomain: "进项税",
        dataItem: "进项税检查项2",
        ruleDescription:
            "针对进项税：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "TAX_011",
        businessDomain: "进项税",
        dataItem: "进项税检查项3",
        ruleDescription:
            "针对进项税：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "TAX_012",
        businessDomain: "进项税",
        dataItem: "进项税检查项4",
        ruleDescription:
            "针对进项税：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "TAX_013",
        businessDomain: "进项税",
        dataItem: "进项税检查项5",
        ruleDescription:
            "针对进项税：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "TAX_014",
        businessDomain: "进项税",
        dataItem: "进项税检查项6",
        ruleDescription:
            "针对进项税：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "TAX_015",
        businessDomain: "进项税",
        dataItem: "进项税检查项7",
        ruleDescription:
            "针对进项税：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "TAX_016",
        businessDomain: "进项税",
        dataItem: "进项税检查项8",
        ruleDescription:
            "针对进项税：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "TAX_017",
        businessDomain: "申报",
        dataItem: "申报检查项1",
        ruleDescription:
            "针对申报：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "TAX_018",
        businessDomain: "申报",
        dataItem: "申报检查项2",
        ruleDescription:
            "针对申报：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "TAX_019",
        businessDomain: "申报",
        dataItem: "申报检查项3",
        ruleDescription:
            "针对申报：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "TAX_020",
        businessDomain: "申报",
        dataItem: "申报检查项4",
        ruleDescription:
            "针对申报：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "TAX_021",
        businessDomain: "申报",
        dataItem: "申报检查项5",
        ruleDescription:
            "针对申报：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "TAX_022",
        businessDomain: "申报",
        dataItem: "申报检查项6",
        ruleDescription:
            "针对申报：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "TAX_023",
        businessDomain: "申报",
        dataItem: "申报检查项7",
        ruleDescription:
            "针对申报：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "TAX_024",
        businessDomain: "申报",
        dataItem: "申报检查项8",
        ruleDescription:
            "针对申报：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "TAX_025",
        businessDomain: "跨境税",
        dataItem: "跨境税检查项1",
        ruleDescription:
            "针对跨境税：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "TAX_026",
        businessDomain: "跨境税",
        dataItem: "跨境税检查项2",
        ruleDescription:
            "针对跨境税：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "TAX_027",
        businessDomain: "跨境税",
        dataItem: "跨境税检查项3",
        ruleDescription:
            "针对跨境税：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "TAX_028",
        businessDomain: "跨境税",
        dataItem: "跨境税检查项4",
        ruleDescription:
            "针对跨境税：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "TAX_029",
        businessDomain: "跨境税",
        dataItem: "跨境税检查项5",
        ruleDescription:
            "针对跨境税：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "TAX_030",
        businessDomain: "跨境税",
        dataItem: "跨境税检查项6",
        ruleDescription:
            "针对跨境税：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "TAX_031",
        businessDomain: "跨境税",
        dataItem: "跨境税检查项7",
        ruleDescription:
            "针对跨境税：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "TAX_032",
        businessDomain: "跨境税",
        dataItem: "跨境税检查项8",
        ruleDescription:
            "针对跨境税：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（税务合规自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const TAX_CATALOG_MARKER_RULE_ID = "TAX_032";
