/** Catalog version — bump when rule set changes. */
export const MFGV_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type MfgVarCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const MFGV_CHECK_RULES_CATALOG: MfgVarCheckRuleCatalogEntry[] = [
    {
        ruleId: "MFG_001",
        businessDomain: "材料成本",
        dataItem: "材料成本检查项1",
        ruleDescription:
            "针对材料成本：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "MFG_002",
        businessDomain: "材料成本",
        dataItem: "材料成本检查项2",
        ruleDescription:
            "针对材料成本：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "MFG_003",
        businessDomain: "材料成本",
        dataItem: "材料成本检查项3",
        ruleDescription:
            "针对材料成本：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "MFG_004",
        businessDomain: "材料成本",
        dataItem: "材料成本检查项4",
        ruleDescription:
            "针对材料成本：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "MFG_005",
        businessDomain: "材料成本",
        dataItem: "材料成本检查项5",
        ruleDescription:
            "针对材料成本：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "MFG_006",
        businessDomain: "材料成本",
        dataItem: "材料成本检查项6",
        ruleDescription:
            "针对材料成本：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "MFG_007",
        businessDomain: "材料成本",
        dataItem: "材料成本检查项7",
        ruleDescription:
            "针对材料成本：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "MFG_008",
        businessDomain: "材料成本",
        dataItem: "材料成本检查项8",
        ruleDescription:
            "针对材料成本：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "MFG_009",
        businessDomain: "人工成本",
        dataItem: "人工成本检查项1",
        ruleDescription:
            "针对人工成本：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "MFG_010",
        businessDomain: "人工成本",
        dataItem: "人工成本检查项2",
        ruleDescription:
            "针对人工成本：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "MFG_011",
        businessDomain: "人工成本",
        dataItem: "人工成本检查项3",
        ruleDescription:
            "针对人工成本：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "MFG_012",
        businessDomain: "人工成本",
        dataItem: "人工成本检查项4",
        ruleDescription:
            "针对人工成本：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "MFG_013",
        businessDomain: "人工成本",
        dataItem: "人工成本检查项5",
        ruleDescription:
            "针对人工成本：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "MFG_014",
        businessDomain: "人工成本",
        dataItem: "人工成本检查项6",
        ruleDescription:
            "针对人工成本：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "MFG_015",
        businessDomain: "人工成本",
        dataItem: "人工成本检查项7",
        ruleDescription:
            "针对人工成本：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "MFG_016",
        businessDomain: "人工成本",
        dataItem: "人工成本检查项8",
        ruleDescription:
            "针对人工成本：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "MFG_017",
        businessDomain: "制造费用",
        dataItem: "制造费用检查项1",
        ruleDescription:
            "针对制造费用：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "MFG_018",
        businessDomain: "制造费用",
        dataItem: "制造费用检查项2",
        ruleDescription:
            "针对制造费用：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "MFG_019",
        businessDomain: "制造费用",
        dataItem: "制造费用检查项3",
        ruleDescription:
            "针对制造费用：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "MFG_020",
        businessDomain: "制造费用",
        dataItem: "制造费用检查项4",
        ruleDescription:
            "针对制造费用：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "MFG_021",
        businessDomain: "制造费用",
        dataItem: "制造费用检查项5",
        ruleDescription:
            "针对制造费用：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "MFG_022",
        businessDomain: "制造费用",
        dataItem: "制造费用检查项6",
        ruleDescription:
            "针对制造费用：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "MFG_023",
        businessDomain: "制造费用",
        dataItem: "制造费用检查项7",
        ruleDescription:
            "针对制造费用：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "MFG_024",
        businessDomain: "制造费用",
        dataItem: "制造费用检查项8",
        ruleDescription:
            "针对制造费用：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "MFG_025",
        businessDomain: "工单完工",
        dataItem: "工单完工检查项1",
        ruleDescription:
            "针对工单完工：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "MFG_026",
        businessDomain: "工单完工",
        dataItem: "工单完工检查项2",
        ruleDescription:
            "针对工单完工：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "MFG_027",
        businessDomain: "工单完工",
        dataItem: "工单完工检查项3",
        ruleDescription:
            "针对工单完工：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "MFG_028",
        businessDomain: "工单完工",
        dataItem: "工单完工检查项4",
        ruleDescription:
            "针对工单完工：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "MFG_029",
        businessDomain: "工单完工",
        dataItem: "工单完工检查项5",
        ruleDescription:
            "针对工单完工：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "MFG_030",
        businessDomain: "工单完工",
        dataItem: "工单完工检查项6",
        ruleDescription:
            "针对工单完工：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "MFG_031",
        businessDomain: "工单完工",
        dataItem: "工单完工检查项7",
        ruleDescription:
            "针对工单完工：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "MFG_032",
        businessDomain: "工单完工",
        dataItem: "工单完工检查项8",
        ruleDescription:
            "针对工单完工：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（生产成本偏差自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const MFGV_CATALOG_MARKER_RULE_ID = "MFG_032";
