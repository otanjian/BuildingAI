/** Catalog version — bump when rule set changes. */
export const HRC_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type HrComplianceCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const HRC_CHECK_RULES_CATALOG: HrComplianceCheckRuleCatalogEntry[] = [
    {
        ruleId: "HR_001",
        businessDomain: "考勤合规",
        dataItem: "考勤合规检查项1",
        ruleDescription:
            "针对考勤合规：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "HR_002",
        businessDomain: "考勤合规",
        dataItem: "考勤合规检查项2",
        ruleDescription:
            "针对考勤合规：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "HR_003",
        businessDomain: "考勤合规",
        dataItem: "考勤合规检查项3",
        ruleDescription:
            "针对考勤合规：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "HR_004",
        businessDomain: "考勤合规",
        dataItem: "考勤合规检查项4",
        ruleDescription:
            "针对考勤合规：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "HR_005",
        businessDomain: "考勤合规",
        dataItem: "考勤合规检查项5",
        ruleDescription:
            "针对考勤合规：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "HR_006",
        businessDomain: "考勤合规",
        dataItem: "考勤合规检查项6",
        ruleDescription:
            "针对考勤合规：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "HR_007",
        businessDomain: "考勤合规",
        dataItem: "考勤合规检查项7",
        ruleDescription:
            "针对考勤合规：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "HR_008",
        businessDomain: "考勤合规",
        dataItem: "考勤合规检查项8",
        ruleDescription:
            "针对考勤合规：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "HR_009",
        businessDomain: "证照",
        dataItem: "证照检查项1",
        ruleDescription:
            "针对证照：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "HR_010",
        businessDomain: "证照",
        dataItem: "证照检查项2",
        ruleDescription:
            "针对证照：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "HR_011",
        businessDomain: "证照",
        dataItem: "证照检查项3",
        ruleDescription:
            "针对证照：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "HR_012",
        businessDomain: "证照",
        dataItem: "证照检查项4",
        ruleDescription:
            "针对证照：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "HR_013",
        businessDomain: "证照",
        dataItem: "证照检查项5",
        ruleDescription:
            "针对证照：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "HR_014",
        businessDomain: "证照",
        dataItem: "证照检查项6",
        ruleDescription:
            "针对证照：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "HR_015",
        businessDomain: "证照",
        dataItem: "证照检查项7",
        ruleDescription:
            "针对证照：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "HR_016",
        businessDomain: "证照",
        dataItem: "证照检查项8",
        ruleDescription:
            "针对证照：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "HR_017",
        businessDomain: "薪酬",
        dataItem: "薪酬检查项1",
        ruleDescription:
            "针对薪酬：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "HR_018",
        businessDomain: "薪酬",
        dataItem: "薪酬检查项2",
        ruleDescription:
            "针对薪酬：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "HR_019",
        businessDomain: "薪酬",
        dataItem: "薪酬检查项3",
        ruleDescription:
            "针对薪酬：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "HR_020",
        businessDomain: "薪酬",
        dataItem: "薪酬检查项4",
        ruleDescription:
            "针对薪酬：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "HR_021",
        businessDomain: "薪酬",
        dataItem: "薪酬检查项5",
        ruleDescription:
            "针对薪酬：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "HR_022",
        businessDomain: "薪酬",
        dataItem: "薪酬检查项6",
        ruleDescription:
            "针对薪酬：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "HR_023",
        businessDomain: "薪酬",
        dataItem: "薪酬检查项7",
        ruleDescription:
            "针对薪酬：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "HR_024",
        businessDomain: "薪酬",
        dataItem: "薪酬检查项8",
        ruleDescription:
            "针对薪酬：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "HR_025",
        businessDomain: "编制",
        dataItem: "编制检查项1",
        ruleDescription:
            "针对编制：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "HR_026",
        businessDomain: "编制",
        dataItem: "编制检查项2",
        ruleDescription:
            "针对编制：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "HR_027",
        businessDomain: "编制",
        dataItem: "编制检查项3",
        ruleDescription:
            "针对编制：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "HR_028",
        businessDomain: "编制",
        dataItem: "编制检查项4",
        ruleDescription:
            "针对编制：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "HR_029",
        businessDomain: "编制",
        dataItem: "编制检查项5",
        ruleDescription:
            "针对编制：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "HR_030",
        businessDomain: "编制",
        dataItem: "编制检查项6",
        ruleDescription:
            "针对编制：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "HR_031",
        businessDomain: "编制",
        dataItem: "编制检查项7",
        ruleDescription:
            "针对编制：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "HR_032",
        businessDomain: "编制",
        dataItem: "编制检查项8",
        ruleDescription:
            "针对编制：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（人力资源合规自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const HRC_CATALOG_MARKER_RULE_ID = "HR_032";
