/** Catalog version — bump when rule set changes. */
export const ESG_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type EsgReportCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const ESG_CHECK_RULES_CATALOG: EsgReportCheckRuleCatalogEntry[] = [
    {
        ruleId: "ESG_001",
        businessDomain: "环境指标",
        dataItem: "环境指标检查项1",
        ruleDescription:
            "针对环境指标：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "ESG_002",
        businessDomain: "环境指标",
        dataItem: "环境指标检查项2",
        ruleDescription:
            "针对环境指标：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "ESG_003",
        businessDomain: "环境指标",
        dataItem: "环境指标检查项3",
        ruleDescription:
            "针对环境指标：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "ESG_004",
        businessDomain: "环境指标",
        dataItem: "环境指标检查项4",
        ruleDescription:
            "针对环境指标：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "ESG_005",
        businessDomain: "环境指标",
        dataItem: "环境指标检查项5",
        ruleDescription:
            "针对环境指标：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "ESG_006",
        businessDomain: "环境指标",
        dataItem: "环境指标检查项6",
        ruleDescription:
            "针对环境指标：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "ESG_007",
        businessDomain: "环境指标",
        dataItem: "环境指标检查项7",
        ruleDescription:
            "针对环境指标：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "ESG_008",
        businessDomain: "环境指标",
        dataItem: "环境指标检查项8",
        ruleDescription:
            "针对环境指标：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "ESG_009",
        businessDomain: "社会指标",
        dataItem: "社会指标检查项1",
        ruleDescription:
            "针对社会指标：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "ESG_010",
        businessDomain: "社会指标",
        dataItem: "社会指标检查项2",
        ruleDescription:
            "针对社会指标：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "ESG_011",
        businessDomain: "社会指标",
        dataItem: "社会指标检查项3",
        ruleDescription:
            "针对社会指标：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "ESG_012",
        businessDomain: "社会指标",
        dataItem: "社会指标检查项4",
        ruleDescription:
            "针对社会指标：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "ESG_013",
        businessDomain: "社会指标",
        dataItem: "社会指标检查项5",
        ruleDescription:
            "针对社会指标：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "ESG_014",
        businessDomain: "社会指标",
        dataItem: "社会指标检查项6",
        ruleDescription:
            "针对社会指标：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "ESG_015",
        businessDomain: "社会指标",
        dataItem: "社会指标检查项7",
        ruleDescription:
            "针对社会指标：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "ESG_016",
        businessDomain: "社会指标",
        dataItem: "社会指标检查项8",
        ruleDescription:
            "针对社会指标：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "ESG_017",
        businessDomain: "治理指标",
        dataItem: "治理指标检查项1",
        ruleDescription:
            "针对治理指标：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "ESG_018",
        businessDomain: "治理指标",
        dataItem: "治理指标检查项2",
        ruleDescription:
            "针对治理指标：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "ESG_019",
        businessDomain: "治理指标",
        dataItem: "治理指标检查项3",
        ruleDescription:
            "针对治理指标：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "ESG_020",
        businessDomain: "治理指标",
        dataItem: "治理指标检查项4",
        ruleDescription:
            "针对治理指标：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "ESG_021",
        businessDomain: "治理指标",
        dataItem: "治理指标检查项5",
        ruleDescription:
            "针对治理指标：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "ESG_022",
        businessDomain: "治理指标",
        dataItem: "治理指标检查项6",
        ruleDescription:
            "针对治理指标：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "ESG_023",
        businessDomain: "治理指标",
        dataItem: "治理指标检查项7",
        ruleDescription:
            "针对治理指标：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "ESG_024",
        businessDomain: "治理指标",
        dataItem: "治理指标检查项8",
        ruleDescription:
            "针对治理指标：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "ESG_025",
        businessDomain: "供应链 ESG",
        dataItem: "供应链 ESG检查项1",
        ruleDescription:
            "针对供应链 ESG：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "ESG_026",
        businessDomain: "供应链 ESG",
        dataItem: "供应链 ESG检查项2",
        ruleDescription:
            "针对供应链 ESG：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "ESG_027",
        businessDomain: "供应链 ESG",
        dataItem: "供应链 ESG检查项3",
        ruleDescription:
            "针对供应链 ESG：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "ESG_028",
        businessDomain: "供应链 ESG",
        dataItem: "供应链 ESG检查项4",
        ruleDescription:
            "针对供应链 ESG：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "ESG_029",
        businessDomain: "供应链 ESG",
        dataItem: "供应链 ESG检查项5",
        ruleDescription:
            "针对供应链 ESG：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "ESG_030",
        businessDomain: "供应链 ESG",
        dataItem: "供应链 ESG检查项6",
        ruleDescription:
            "针对供应链 ESG：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "ESG_031",
        businessDomain: "供应链 ESG",
        dataItem: "供应链 ESG检查项7",
        ruleDescription:
            "针对供应链 ESG：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "ESG_032",
        businessDomain: "供应链 ESG",
        dataItem: "供应链 ESG检查项8",
        ruleDescription:
            "针对供应链 ESG：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（ESG 合规披露自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const ESG_CATALOG_MARKER_RULE_ID = "ESG_032";
