/** Catalog version — bump when rule set changes. */
export const PRJ_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type ProjectHealthCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const PRJ_CHECK_RULES_CATALOG: ProjectHealthCheckRuleCatalogEntry[] = [
    {
        ruleId: "PRJ_001",
        businessDomain: "进度",
        dataItem: "进度检查项1",
        ruleDescription:
            "针对进度：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "PRJ_002",
        businessDomain: "进度",
        dataItem: "进度检查项2",
        ruleDescription:
            "针对进度：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "PRJ_003",
        businessDomain: "进度",
        dataItem: "进度检查项3",
        ruleDescription:
            "针对进度：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "PRJ_004",
        businessDomain: "进度",
        dataItem: "进度检查项4",
        ruleDescription:
            "针对进度：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "PRJ_005",
        businessDomain: "进度",
        dataItem: "进度检查项5",
        ruleDescription:
            "针对进度：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "PRJ_006",
        businessDomain: "进度",
        dataItem: "进度检查项6",
        ruleDescription:
            "针对进度：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "PRJ_007",
        businessDomain: "进度",
        dataItem: "进度检查项7",
        ruleDescription:
            "针对进度：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "PRJ_008",
        businessDomain: "进度",
        dataItem: "进度检查项8",
        ruleDescription:
            "针对进度：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "PRJ_009",
        businessDomain: "成本",
        dataItem: "成本检查项1",
        ruleDescription:
            "针对成本：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "PRJ_010",
        businessDomain: "成本",
        dataItem: "成本检查项2",
        ruleDescription:
            "针对成本：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "PRJ_011",
        businessDomain: "成本",
        dataItem: "成本检查项3",
        ruleDescription:
            "针对成本：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "PRJ_012",
        businessDomain: "成本",
        dataItem: "成本检查项4",
        ruleDescription:
            "针对成本：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "PRJ_013",
        businessDomain: "成本",
        dataItem: "成本检查项5",
        ruleDescription:
            "针对成本：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "PRJ_014",
        businessDomain: "成本",
        dataItem: "成本检查项6",
        ruleDescription:
            "针对成本：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "PRJ_015",
        businessDomain: "成本",
        dataItem: "成本检查项7",
        ruleDescription:
            "针对成本：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "PRJ_016",
        businessDomain: "成本",
        dataItem: "成本检查项8",
        ruleDescription:
            "针对成本：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "PRJ_017",
        businessDomain: "资源",
        dataItem: "资源检查项1",
        ruleDescription:
            "针对资源：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "PRJ_018",
        businessDomain: "资源",
        dataItem: "资源检查项2",
        ruleDescription:
            "针对资源：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "PRJ_019",
        businessDomain: "资源",
        dataItem: "资源检查项3",
        ruleDescription:
            "针对资源：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "PRJ_020",
        businessDomain: "资源",
        dataItem: "资源检查项4",
        ruleDescription:
            "针对资源：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "PRJ_021",
        businessDomain: "资源",
        dataItem: "资源检查项5",
        ruleDescription:
            "针对资源：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "PRJ_022",
        businessDomain: "资源",
        dataItem: "资源检查项6",
        ruleDescription:
            "针对资源：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "PRJ_023",
        businessDomain: "资源",
        dataItem: "资源检查项7",
        ruleDescription:
            "针对资源：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "PRJ_024",
        businessDomain: "资源",
        dataItem: "资源检查项8",
        ruleDescription:
            "针对资源：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "PRJ_025",
        businessDomain: "范围",
        dataItem: "范围检查项1",
        ruleDescription:
            "针对范围：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "PRJ_026",
        businessDomain: "范围",
        dataItem: "范围检查项2",
        ruleDescription:
            "针对范围：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "PRJ_027",
        businessDomain: "范围",
        dataItem: "范围检查项3",
        ruleDescription:
            "针对范围：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "PRJ_028",
        businessDomain: "范围",
        dataItem: "范围检查项4",
        ruleDescription:
            "针对范围：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "PRJ_029",
        businessDomain: "范围",
        dataItem: "范围检查项5",
        ruleDescription:
            "针对范围：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "PRJ_030",
        businessDomain: "范围",
        dataItem: "范围检查项6",
        ruleDescription:
            "针对范围：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "PRJ_031",
        businessDomain: "范围",
        dataItem: "范围检查项7",
        ruleDescription:
            "针对范围：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "PRJ_032",
        businessDomain: "范围",
        dataItem: "范围检查项8",
        ruleDescription:
            "针对范围：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（项目交付健康自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const PRJ_CATALOG_MARKER_RULE_ID = "PRJ_032";
