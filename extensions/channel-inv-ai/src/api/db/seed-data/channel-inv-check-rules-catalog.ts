/** Catalog version — bump when rule set changes. */
export const CHI_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type ChannelInvCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const CHI_CHECK_RULES_CATALOG: ChannelInvCheckRuleCatalogEntry[] = [
    {
        ruleId: "CHI_001",
        businessDomain: "渠道库存",
        dataItem: "渠道库存检查项1",
        ruleDescription:
            "针对渠道库存：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "CHI_002",
        businessDomain: "渠道库存",
        dataItem: "渠道库存检查项2",
        ruleDescription:
            "针对渠道库存：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "CHI_003",
        businessDomain: "渠道库存",
        dataItem: "渠道库存检查项3",
        ruleDescription:
            "针对渠道库存：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "CHI_004",
        businessDomain: "渠道库存",
        dataItem: "渠道库存检查项4",
        ruleDescription:
            "针对渠道库存：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "CHI_005",
        businessDomain: "渠道库存",
        dataItem: "渠道库存检查项5",
        ruleDescription:
            "针对渠道库存：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "CHI_006",
        businessDomain: "渠道库存",
        dataItem: "渠道库存检查项6",
        ruleDescription:
            "针对渠道库存：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "CHI_007",
        businessDomain: "渠道库存",
        dataItem: "渠道库存检查项7",
        ruleDescription:
            "针对渠道库存：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "CHI_008",
        businessDomain: "渠道库存",
        dataItem: "渠道库存检查项8",
        ruleDescription:
            "针对渠道库存：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "CHI_009",
        businessDomain: "补货",
        dataItem: "补货检查项1",
        ruleDescription:
            "针对补货：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "CHI_010",
        businessDomain: "补货",
        dataItem: "补货检查项2",
        ruleDescription:
            "针对补货：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "CHI_011",
        businessDomain: "补货",
        dataItem: "补货检查项3",
        ruleDescription:
            "针对补货：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "CHI_012",
        businessDomain: "补货",
        dataItem: "补货检查项4",
        ruleDescription:
            "针对补货：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "CHI_013",
        businessDomain: "补货",
        dataItem: "补货检查项5",
        ruleDescription:
            "针对补货：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "CHI_014",
        businessDomain: "补货",
        dataItem: "补货检查项6",
        ruleDescription:
            "针对补货：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "CHI_015",
        businessDomain: "补货",
        dataItem: "补货检查项7",
        ruleDescription:
            "针对补货：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "CHI_016",
        businessDomain: "补货",
        dataItem: "补货检查项8",
        ruleDescription:
            "针对补货：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "CHI_017",
        businessDomain: "窜货",
        dataItem: "窜货检查项1",
        ruleDescription:
            "针对窜货：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "CHI_018",
        businessDomain: "窜货",
        dataItem: "窜货检查项2",
        ruleDescription:
            "针对窜货：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "CHI_019",
        businessDomain: "窜货",
        dataItem: "窜货检查项3",
        ruleDescription:
            "针对窜货：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "CHI_020",
        businessDomain: "窜货",
        dataItem: "窜货检查项4",
        ruleDescription:
            "针对窜货：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "CHI_021",
        businessDomain: "窜货",
        dataItem: "窜货检查项5",
        ruleDescription:
            "针对窜货：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "CHI_022",
        businessDomain: "窜货",
        dataItem: "窜货检查项6",
        ruleDescription:
            "针对窜货：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "CHI_023",
        businessDomain: "窜货",
        dataItem: "窜货检查项7",
        ruleDescription:
            "针对窜货：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "CHI_024",
        businessDomain: "窜货",
        dataItem: "窜货检查项8",
        ruleDescription:
            "针对窜货：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "CHI_025",
        businessDomain: "渠道呆滞",
        dataItem: "渠道呆滞检查项1",
        ruleDescription:
            "针对渠道呆滞：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "CHI_026",
        businessDomain: "渠道呆滞",
        dataItem: "渠道呆滞检查项2",
        ruleDescription:
            "针对渠道呆滞：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "CHI_027",
        businessDomain: "渠道呆滞",
        dataItem: "渠道呆滞检查项3",
        ruleDescription:
            "针对渠道呆滞：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "CHI_028",
        businessDomain: "渠道呆滞",
        dataItem: "渠道呆滞检查项4",
        ruleDescription:
            "针对渠道呆滞：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "CHI_029",
        businessDomain: "渠道呆滞",
        dataItem: "渠道呆滞检查项5",
        ruleDescription:
            "针对渠道呆滞：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "CHI_030",
        businessDomain: "渠道呆滞",
        dataItem: "渠道呆滞检查项6",
        ruleDescription:
            "针对渠道呆滞：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "CHI_031",
        businessDomain: "渠道呆滞",
        dataItem: "渠道呆滞检查项7",
        ruleDescription:
            "针对渠道呆滞：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "CHI_032",
        businessDomain: "渠道呆滞",
        dataItem: "渠道呆滞检查项8",
        ruleDescription:
            "针对渠道呆滞：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（渠道库存协同自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const CHI_CATALOG_MARKER_RULE_ID = "CHI_032";
