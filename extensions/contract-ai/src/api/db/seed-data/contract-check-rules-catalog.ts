/** Catalog version — bump when rule set changes. */
export const CTR_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type ContractCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const CTR_CHECK_RULES_CATALOG: ContractCheckRuleCatalogEntry[] = [
    {
        ruleId: "CTR_001",
        businessDomain: "合同到期",
        dataItem: "合同到期检查项1",
        ruleDescription:
            "针对合同到期：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "CTR_002",
        businessDomain: "合同到期",
        dataItem: "合同到期检查项2",
        ruleDescription:
            "针对合同到期：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "CTR_003",
        businessDomain: "合同到期",
        dataItem: "合同到期检查项3",
        ruleDescription:
            "针对合同到期：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "CTR_004",
        businessDomain: "合同到期",
        dataItem: "合同到期检查项4",
        ruleDescription:
            "针对合同到期：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "CTR_005",
        businessDomain: "合同到期",
        dataItem: "合同到期检查项5",
        ruleDescription:
            "针对合同到期：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "CTR_006",
        businessDomain: "合同到期",
        dataItem: "合同到期检查项6",
        ruleDescription:
            "针对合同到期：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "CTR_007",
        businessDomain: "合同到期",
        dataItem: "合同到期检查项7",
        ruleDescription:
            "针对合同到期：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "CTR_008",
        businessDomain: "合同到期",
        dataItem: "合同到期检查项8",
        ruleDescription:
            "针对合同到期：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "CTR_009",
        businessDomain: "SLA",
        dataItem: "SLA检查项1",
        ruleDescription:
            "针对SLA：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "CTR_010",
        businessDomain: "SLA",
        dataItem: "SLA检查项2",
        ruleDescription:
            "针对SLA：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "CTR_011",
        businessDomain: "SLA",
        dataItem: "SLA检查项3",
        ruleDescription:
            "针对SLA：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "CTR_012",
        businessDomain: "SLA",
        dataItem: "SLA检查项4",
        ruleDescription:
            "针对SLA：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "CTR_013",
        businessDomain: "SLA",
        dataItem: "SLA检查项5",
        ruleDescription:
            "针对SLA：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "CTR_014",
        businessDomain: "SLA",
        dataItem: "SLA检查项6",
        ruleDescription:
            "针对SLA：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "CTR_015",
        businessDomain: "SLA",
        dataItem: "SLA检查项7",
        ruleDescription:
            "针对SLA：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "CTR_016",
        businessDomain: "SLA",
        dataItem: "SLA检查项8",
        ruleDescription:
            "针对SLA：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "CTR_017",
        businessDomain: "金额执行",
        dataItem: "金额执行检查项1",
        ruleDescription:
            "针对金额执行：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "CTR_018",
        businessDomain: "金额执行",
        dataItem: "金额执行检查项2",
        ruleDescription:
            "针对金额执行：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "CTR_019",
        businessDomain: "金额执行",
        dataItem: "金额执行检查项3",
        ruleDescription:
            "针对金额执行：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "CTR_020",
        businessDomain: "金额执行",
        dataItem: "金额执行检查项4",
        ruleDescription:
            "针对金额执行：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "CTR_021",
        businessDomain: "金额执行",
        dataItem: "金额执行检查项5",
        ruleDescription:
            "针对金额执行：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "CTR_022",
        businessDomain: "金额执行",
        dataItem: "金额执行检查项6",
        ruleDescription:
            "针对金额执行：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "CTR_023",
        businessDomain: "金额执行",
        dataItem: "金额执行检查项7",
        ruleDescription:
            "针对金额执行：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "CTR_024",
        businessDomain: "金额执行",
        dataItem: "金额执行检查项8",
        ruleDescription:
            "针对金额执行：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "CTR_025",
        businessDomain: "续约",
        dataItem: "续约检查项1",
        ruleDescription:
            "针对续约：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "CTR_026",
        businessDomain: "续约",
        dataItem: "续约检查项2",
        ruleDescription:
            "针对续约：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "CTR_027",
        businessDomain: "续约",
        dataItem: "续约检查项3",
        ruleDescription:
            "针对续约：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "CTR_028",
        businessDomain: "续约",
        dataItem: "续约检查项4",
        ruleDescription:
            "针对续约：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "CTR_029",
        businessDomain: "续约",
        dataItem: "续约检查项5",
        ruleDescription:
            "针对续约：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "CTR_030",
        businessDomain: "续约",
        dataItem: "续约检查项6",
        ruleDescription:
            "针对续约：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "CTR_031",
        businessDomain: "续约",
        dataItem: "续约检查项7",
        ruleDescription:
            "针对续约：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "CTR_032",
        businessDomain: "续约",
        dataItem: "续约检查项8",
        ruleDescription:
            "针对续约：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（合同履约自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const CTR_CATALOG_MARKER_RULE_ID = "CTR_032";
