/** Catalog version — bump when rule set changes. */
export const AST_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type AssetLifeCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const AST_CHECK_RULES_CATALOG: AssetLifeCheckRuleCatalogEntry[] = [
    {
        ruleId: "AST_001",
        businessDomain: "资产台账",
        dataItem: "资产台账检查项1",
        ruleDescription:
            "针对资产台账：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "AST_002",
        businessDomain: "资产台账",
        dataItem: "资产台账检查项2",
        ruleDescription:
            "针对资产台账：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "AST_003",
        businessDomain: "资产台账",
        dataItem: "资产台账检查项3",
        ruleDescription:
            "针对资产台账：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "AST_004",
        businessDomain: "资产台账",
        dataItem: "资产台账检查项4",
        ruleDescription:
            "针对资产台账：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AST_005",
        businessDomain: "资产台账",
        dataItem: "资产台账检查项5",
        ruleDescription:
            "针对资产台账：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AST_006",
        businessDomain: "资产台账",
        dataItem: "资产台账检查项6",
        ruleDescription:
            "针对资产台账：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AST_007",
        businessDomain: "资产台账",
        dataItem: "资产台账检查项7",
        ruleDescription:
            "针对资产台账：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AST_008",
        businessDomain: "资产台账",
        dataItem: "资产台账检查项8",
        ruleDescription:
            "针对资产台账：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "AST_009",
        businessDomain: "折旧计提",
        dataItem: "折旧计提检查项1",
        ruleDescription:
            "针对折旧计提：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "AST_010",
        businessDomain: "折旧计提",
        dataItem: "折旧计提检查项2",
        ruleDescription:
            "针对折旧计提：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "AST_011",
        businessDomain: "折旧计提",
        dataItem: "折旧计提检查项3",
        ruleDescription:
            "针对折旧计提：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AST_012",
        businessDomain: "折旧计提",
        dataItem: "折旧计提检查项4",
        ruleDescription:
            "针对折旧计提：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AST_013",
        businessDomain: "折旧计提",
        dataItem: "折旧计提检查项5",
        ruleDescription:
            "针对折旧计提：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AST_014",
        businessDomain: "折旧计提",
        dataItem: "折旧计提检查项6",
        ruleDescription:
            "针对折旧计提：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AST_015",
        businessDomain: "折旧计提",
        dataItem: "折旧计提检查项7",
        ruleDescription:
            "针对折旧计提：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "AST_016",
        businessDomain: "折旧计提",
        dataItem: "折旧计提检查项8",
        ruleDescription:
            "针对折旧计提：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "AST_017",
        businessDomain: "盘点",
        dataItem: "盘点检查项1",
        ruleDescription:
            "针对盘点：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "AST_018",
        businessDomain: "盘点",
        dataItem: "盘点检查项2",
        ruleDescription:
            "针对盘点：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AST_019",
        businessDomain: "盘点",
        dataItem: "盘点检查项3",
        ruleDescription:
            "针对盘点：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AST_020",
        businessDomain: "盘点",
        dataItem: "盘点检查项4",
        ruleDescription:
            "针对盘点：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AST_021",
        businessDomain: "盘点",
        dataItem: "盘点检查项5",
        ruleDescription:
            "针对盘点：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AST_022",
        businessDomain: "盘点",
        dataItem: "盘点检查项6",
        ruleDescription:
            "针对盘点：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "AST_023",
        businessDomain: "盘点",
        dataItem: "盘点检查项7",
        ruleDescription:
            "针对盘点：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "AST_024",
        businessDomain: "盘点",
        dataItem: "盘点检查项8",
        ruleDescription:
            "针对盘点：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "AST_025",
        businessDomain: "处置",
        dataItem: "处置检查项1",
        ruleDescription:
            "针对处置：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "AST_026",
        businessDomain: "处置",
        dataItem: "处置检查项2",
        ruleDescription:
            "针对处置：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "AST_027",
        businessDomain: "处置",
        dataItem: "处置检查项3",
        ruleDescription:
            "针对处置：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "AST_028",
        businessDomain: "处置",
        dataItem: "处置检查项4",
        ruleDescription:
            "针对处置：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "AST_029",
        businessDomain: "处置",
        dataItem: "处置检查项5",
        ruleDescription:
            "针对处置：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "AST_030",
        businessDomain: "处置",
        dataItem: "处置检查项6",
        ruleDescription:
            "针对处置：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "AST_031",
        businessDomain: "处置",
        dataItem: "处置检查项7",
        ruleDescription:
            "针对处置：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "AST_032",
        businessDomain: "处置",
        dataItem: "处置检查项8",
        ruleDescription:
            "针对处置：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（固定资产全生命周期自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const AST_CATALOG_MARKER_RULE_ID = "AST_032";
