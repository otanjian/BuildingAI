/** Catalog version — bump when rule set changes. */
export const SLA_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type ServiceSlaCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const SLA_CHECK_RULES_CATALOG: ServiceSlaCheckRuleCatalogEntry[] = [
    {
        ruleId: "SLA_001",
        businessDomain: "响应时效",
        dataItem: "响应时效检查项1",
        ruleDescription:
            "针对响应时效：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "SLA_002",
        businessDomain: "响应时效",
        dataItem: "响应时效检查项2",
        ruleDescription:
            "针对响应时效：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "SLA_003",
        businessDomain: "响应时效",
        dataItem: "响应时效检查项3",
        ruleDescription:
            "针对响应时效：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "SLA_004",
        businessDomain: "响应时效",
        dataItem: "响应时效检查项4",
        ruleDescription:
            "针对响应时效：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "SLA_005",
        businessDomain: "响应时效",
        dataItem: "响应时效检查项5",
        ruleDescription:
            "针对响应时效：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "SLA_006",
        businessDomain: "响应时效",
        dataItem: "响应时效检查项6",
        ruleDescription:
            "针对响应时效：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "SLA_007",
        businessDomain: "响应时效",
        dataItem: "响应时效检查项7",
        ruleDescription:
            "针对响应时效：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "SLA_008",
        businessDomain: "响应时效",
        dataItem: "响应时效检查项8",
        ruleDescription:
            "针对响应时效：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "SLA_009",
        businessDomain: "解决时效",
        dataItem: "解决时效检查项1",
        ruleDescription:
            "针对解决时效：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "SLA_010",
        businessDomain: "解决时效",
        dataItem: "解决时效检查项2",
        ruleDescription:
            "针对解决时效：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "SLA_011",
        businessDomain: "解决时效",
        dataItem: "解决时效检查项3",
        ruleDescription:
            "针对解决时效：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "SLA_012",
        businessDomain: "解决时效",
        dataItem: "解决时效检查项4",
        ruleDescription:
            "针对解决时效：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "SLA_013",
        businessDomain: "解决时效",
        dataItem: "解决时效检查项5",
        ruleDescription:
            "针对解决时效：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "SLA_014",
        businessDomain: "解决时效",
        dataItem: "解决时效检查项6",
        ruleDescription:
            "针对解决时效：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "SLA_015",
        businessDomain: "解决时效",
        dataItem: "解决时效检查项7",
        ruleDescription:
            "针对解决时效：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "SLA_016",
        businessDomain: "解决时效",
        dataItem: "解决时效检查项8",
        ruleDescription:
            "针对解决时效：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "SLA_017",
        businessDomain: "备件",
        dataItem: "备件检查项1",
        ruleDescription:
            "针对备件：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "SLA_018",
        businessDomain: "备件",
        dataItem: "备件检查项2",
        ruleDescription:
            "针对备件：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "SLA_019",
        businessDomain: "备件",
        dataItem: "备件检查项3",
        ruleDescription:
            "针对备件：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "SLA_020",
        businessDomain: "备件",
        dataItem: "备件检查项4",
        ruleDescription:
            "针对备件：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "SLA_021",
        businessDomain: "备件",
        dataItem: "备件检查项5",
        ruleDescription:
            "针对备件：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "SLA_022",
        businessDomain: "备件",
        dataItem: "备件检查项6",
        ruleDescription:
            "针对备件：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "SLA_023",
        businessDomain: "备件",
        dataItem: "备件检查项7",
        ruleDescription:
            "针对备件：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "SLA_024",
        businessDomain: "备件",
        dataItem: "备件检查项8",
        ruleDescription:
            "针对备件：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "SLA_025",
        businessDomain: "一次修复率",
        dataItem: "一次修复率检查项1",
        ruleDescription:
            "针对一次修复率：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "SLA_026",
        businessDomain: "一次修复率",
        dataItem: "一次修复率检查项2",
        ruleDescription:
            "针对一次修复率：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "SLA_027",
        businessDomain: "一次修复率",
        dataItem: "一次修复率检查项3",
        ruleDescription:
            "针对一次修复率：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "SLA_028",
        businessDomain: "一次修复率",
        dataItem: "一次修复率检查项4",
        ruleDescription:
            "针对一次修复率：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "SLA_029",
        businessDomain: "一次修复率",
        dataItem: "一次修复率检查项5",
        ruleDescription:
            "针对一次修复率：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "SLA_030",
        businessDomain: "一次修复率",
        dataItem: "一次修复率检查项6",
        ruleDescription:
            "针对一次修复率：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "SLA_031",
        businessDomain: "一次修复率",
        dataItem: "一次修复率检查项7",
        ruleDescription:
            "针对一次修复率：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "SLA_032",
        businessDomain: "一次修复率",
        dataItem: "一次修复率检查项8",
        ruleDescription:
            "针对一次修复率：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（售后服务 SLA 自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const SLA_CATALOG_MARKER_RULE_ID = "SLA_032";
