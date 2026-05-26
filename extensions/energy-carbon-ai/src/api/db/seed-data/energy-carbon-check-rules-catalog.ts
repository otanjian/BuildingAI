/** Catalog version — bump when rule set changes. */
export const ECO_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type EnergyCarbonCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const ECO_CHECK_RULES_CATALOG: EnergyCarbonCheckRuleCatalogEntry[] = [
    {
        ruleId: "ECO_001",
        businessDomain: "能耗",
        dataItem: "能耗检查项1",
        ruleDescription:
            "针对能耗：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "ECO_002",
        businessDomain: "能耗",
        dataItem: "能耗检查项2",
        ruleDescription:
            "针对能耗：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "ECO_003",
        businessDomain: "能耗",
        dataItem: "能耗检查项3",
        ruleDescription:
            "针对能耗：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "ECO_004",
        businessDomain: "能耗",
        dataItem: "能耗检查项4",
        ruleDescription:
            "针对能耗：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "ECO_005",
        businessDomain: "能耗",
        dataItem: "能耗检查项5",
        ruleDescription:
            "针对能耗：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "ECO_006",
        businessDomain: "能耗",
        dataItem: "能耗检查项6",
        ruleDescription:
            "针对能耗：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "ECO_007",
        businessDomain: "能耗",
        dataItem: "能耗检查项7",
        ruleDescription:
            "针对能耗：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "ECO_008",
        businessDomain: "能耗",
        dataItem: "能耗检查项8",
        ruleDescription:
            "针对能耗：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "ECO_009",
        businessDomain: "碳排",
        dataItem: "碳排检查项1",
        ruleDescription:
            "针对碳排：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "ECO_010",
        businessDomain: "碳排",
        dataItem: "碳排检查项2",
        ruleDescription:
            "针对碳排：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "ECO_011",
        businessDomain: "碳排",
        dataItem: "碳排检查项3",
        ruleDescription:
            "针对碳排：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "ECO_012",
        businessDomain: "碳排",
        dataItem: "碳排检查项4",
        ruleDescription:
            "针对碳排：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "ECO_013",
        businessDomain: "碳排",
        dataItem: "碳排检查项5",
        ruleDescription:
            "针对碳排：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "ECO_014",
        businessDomain: "碳排",
        dataItem: "碳排检查项6",
        ruleDescription:
            "针对碳排：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "ECO_015",
        businessDomain: "碳排",
        dataItem: "碳排检查项7",
        ruleDescription:
            "针对碳排：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "ECO_016",
        businessDomain: "碳排",
        dataItem: "碳排检查项8",
        ruleDescription:
            "针对碳排：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "ECO_017",
        businessDomain: "计量",
        dataItem: "计量检查项1",
        ruleDescription:
            "针对计量：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "ECO_018",
        businessDomain: "计量",
        dataItem: "计量检查项2",
        ruleDescription:
            "针对计量：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "ECO_019",
        businessDomain: "计量",
        dataItem: "计量检查项3",
        ruleDescription:
            "针对计量：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "ECO_020",
        businessDomain: "计量",
        dataItem: "计量检查项4",
        ruleDescription:
            "针对计量：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "ECO_021",
        businessDomain: "计量",
        dataItem: "计量检查项5",
        ruleDescription:
            "针对计量：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "ECO_022",
        businessDomain: "计量",
        dataItem: "计量检查项6",
        ruleDescription:
            "针对计量：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "ECO_023",
        businessDomain: "计量",
        dataItem: "计量检查项7",
        ruleDescription:
            "针对计量：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "ECO_024",
        businessDomain: "计量",
        dataItem: "计量检查项8",
        ruleDescription:
            "针对计量：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "ECO_025",
        businessDomain: "节能",
        dataItem: "节能检查项1",
        ruleDescription:
            "针对节能：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "ECO_026",
        businessDomain: "节能",
        dataItem: "节能检查项2",
        ruleDescription:
            "针对节能：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "ECO_027",
        businessDomain: "节能",
        dataItem: "节能检查项3",
        ruleDescription:
            "针对节能：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "ECO_028",
        businessDomain: "节能",
        dataItem: "节能检查项4",
        ruleDescription:
            "针对节能：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "ECO_029",
        businessDomain: "节能",
        dataItem: "节能检查项5",
        ruleDescription:
            "针对节能：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "ECO_030",
        businessDomain: "节能",
        dataItem: "节能检查项6",
        ruleDescription:
            "针对节能：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "ECO_031",
        businessDomain: "节能",
        dataItem: "节能检查项7",
        ruleDescription:
            "针对节能：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "ECO_032",
        businessDomain: "节能",
        dataItem: "节能检查项8",
        ruleDescription:
            "针对节能：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（能源与碳排放自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const ECO_CATALOG_MARKER_RULE_ID = "ECO_032";
