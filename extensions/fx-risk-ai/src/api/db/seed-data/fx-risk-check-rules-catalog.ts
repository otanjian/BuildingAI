/** Catalog version — bump when rule set changes. */
export const FXR_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type FxRiskCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const FXR_CHECK_RULES_CATALOG: FxRiskCheckRuleCatalogEntry[] = [
    {
        ruleId: "FX_001",
        businessDomain: "敞口",
        dataItem: "敞口检查项1",
        ruleDescription:
            "针对敞口：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "FX_002",
        businessDomain: "敞口",
        dataItem: "敞口检查项2",
        ruleDescription:
            "针对敞口：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "FX_003",
        businessDomain: "敞口",
        dataItem: "敞口检查项3",
        ruleDescription:
            "针对敞口：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "FX_004",
        businessDomain: "敞口",
        dataItem: "敞口检查项4",
        ruleDescription:
            "针对敞口：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "FX_005",
        businessDomain: "敞口",
        dataItem: "敞口检查项5",
        ruleDescription:
            "针对敞口：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "FX_006",
        businessDomain: "敞口",
        dataItem: "敞口检查项6",
        ruleDescription:
            "针对敞口：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "FX_007",
        businessDomain: "敞口",
        dataItem: "敞口检查项7",
        ruleDescription:
            "针对敞口：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "FX_008",
        businessDomain: "敞口",
        dataItem: "敞口检查项8",
        ruleDescription:
            "针对敞口：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "FX_009",
        businessDomain: "汇兑损益",
        dataItem: "汇兑损益检查项1",
        ruleDescription:
            "针对汇兑损益：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "FX_010",
        businessDomain: "汇兑损益",
        dataItem: "汇兑损益检查项2",
        ruleDescription:
            "针对汇兑损益：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "FX_011",
        businessDomain: "汇兑损益",
        dataItem: "汇兑损益检查项3",
        ruleDescription:
            "针对汇兑损益：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "FX_012",
        businessDomain: "汇兑损益",
        dataItem: "汇兑损益检查项4",
        ruleDescription:
            "针对汇兑损益：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "FX_013",
        businessDomain: "汇兑损益",
        dataItem: "汇兑损益检查项5",
        ruleDescription:
            "针对汇兑损益：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "FX_014",
        businessDomain: "汇兑损益",
        dataItem: "汇兑损益检查项6",
        ruleDescription:
            "针对汇兑损益：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "FX_015",
        businessDomain: "汇兑损益",
        dataItem: "汇兑损益检查项7",
        ruleDescription:
            "针对汇兑损益：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "FX_016",
        businessDomain: "汇兑损益",
        dataItem: "汇兑损益检查项8",
        ruleDescription:
            "针对汇兑损益：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "FX_017",
        businessDomain: "汇率",
        dataItem: "汇率检查项1",
        ruleDescription:
            "针对汇率：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "FX_018",
        businessDomain: "汇率",
        dataItem: "汇率检查项2",
        ruleDescription:
            "针对汇率：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "FX_019",
        businessDomain: "汇率",
        dataItem: "汇率检查项3",
        ruleDescription:
            "针对汇率：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "FX_020",
        businessDomain: "汇率",
        dataItem: "汇率检查项4",
        ruleDescription:
            "针对汇率：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "FX_021",
        businessDomain: "汇率",
        dataItem: "汇率检查项5",
        ruleDescription:
            "针对汇率：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "FX_022",
        businessDomain: "汇率",
        dataItem: "汇率检查项6",
        ruleDescription:
            "针对汇率：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "FX_023",
        businessDomain: "汇率",
        dataItem: "汇率检查项7",
        ruleDescription:
            "针对汇率：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "FX_024",
        businessDomain: "汇率",
        dataItem: "汇率检查项8",
        ruleDescription:
            "针对汇率：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "FX_025",
        businessDomain: "对冲",
        dataItem: "对冲检查项1",
        ruleDescription:
            "针对对冲：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "FX_026",
        businessDomain: "对冲",
        dataItem: "对冲检查项2",
        ruleDescription:
            "针对对冲：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "FX_027",
        businessDomain: "对冲",
        dataItem: "对冲检查项3",
        ruleDescription:
            "针对对冲：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "FX_028",
        businessDomain: "对冲",
        dataItem: "对冲检查项4",
        ruleDescription:
            "针对对冲：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "FX_029",
        businessDomain: "对冲",
        dataItem: "对冲检查项5",
        ruleDescription:
            "针对对冲：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "FX_030",
        businessDomain: "对冲",
        dataItem: "对冲检查项6",
        ruleDescription:
            "针对对冲：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "FX_031",
        businessDomain: "对冲",
        dataItem: "对冲检查项7",
        ruleDescription:
            "针对对冲：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "FX_032",
        businessDomain: "对冲",
        dataItem: "对冲检查项8",
        ruleDescription:
            "针对对冲：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（外汇风险自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const FXR_CATALOG_MARKER_RULE_ID = "FX_032";
