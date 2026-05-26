/** Catalog version — bump when rule set changes. */
export const BDG_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type BudgetControlCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const BDG_CHECK_RULES_CATALOG: BudgetControlCheckRuleCatalogEntry[] = [
    {
        ruleId: "BDG_001",
        businessDomain: "部门预算",
        dataItem: "部门预算检查项1",
        ruleDescription:
            "针对部门预算：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "BDG_002",
        businessDomain: "部门预算",
        dataItem: "部门预算检查项2",
        ruleDescription:
            "针对部门预算：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "BDG_003",
        businessDomain: "部门预算",
        dataItem: "部门预算检查项3",
        ruleDescription:
            "针对部门预算：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "BDG_004",
        businessDomain: "部门预算",
        dataItem: "部门预算检查项4",
        ruleDescription:
            "针对部门预算：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "BDG_005",
        businessDomain: "部门预算",
        dataItem: "部门预算检查项5",
        ruleDescription:
            "针对部门预算：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "BDG_006",
        businessDomain: "部门预算",
        dataItem: "部门预算检查项6",
        ruleDescription:
            "针对部门预算：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "BDG_007",
        businessDomain: "部门预算",
        dataItem: "部门预算检查项7",
        ruleDescription:
            "针对部门预算：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "BDG_008",
        businessDomain: "部门预算",
        dataItem: "部门预算检查项8",
        ruleDescription:
            "针对部门预算：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "BDG_009",
        businessDomain: "项目预算",
        dataItem: "项目预算检查项1",
        ruleDescription:
            "针对项目预算：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "BDG_010",
        businessDomain: "项目预算",
        dataItem: "项目预算检查项2",
        ruleDescription:
            "针对项目预算：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "BDG_011",
        businessDomain: "项目预算",
        dataItem: "项目预算检查项3",
        ruleDescription:
            "针对项目预算：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "BDG_012",
        businessDomain: "项目预算",
        dataItem: "项目预算检查项4",
        ruleDescription:
            "针对项目预算：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "BDG_013",
        businessDomain: "项目预算",
        dataItem: "项目预算检查项5",
        ruleDescription:
            "针对项目预算：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "BDG_014",
        businessDomain: "项目预算",
        dataItem: "项目预算检查项6",
        ruleDescription:
            "针对项目预算：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "BDG_015",
        businessDomain: "项目预算",
        dataItem: "项目预算检查项7",
        ruleDescription:
            "针对项目预算：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "BDG_016",
        businessDomain: "项目预算",
        dataItem: "项目预算检查项8",
        ruleDescription:
            "针对项目预算：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "BDG_017",
        businessDomain: "冻结",
        dataItem: "冻结检查项1",
        ruleDescription:
            "针对冻结：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "BDG_018",
        businessDomain: "冻结",
        dataItem: "冻结检查项2",
        ruleDescription:
            "针对冻结：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "BDG_019",
        businessDomain: "冻结",
        dataItem: "冻结检查项3",
        ruleDescription:
            "针对冻结：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "BDG_020",
        businessDomain: "冻结",
        dataItem: "冻结检查项4",
        ruleDescription:
            "针对冻结：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "BDG_021",
        businessDomain: "冻结",
        dataItem: "冻结检查项5",
        ruleDescription:
            "针对冻结：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "BDG_022",
        businessDomain: "冻结",
        dataItem: "冻结检查项6",
        ruleDescription:
            "针对冻结：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "BDG_023",
        businessDomain: "冻结",
        dataItem: "冻结检查项7",
        ruleDescription:
            "针对冻结：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "BDG_024",
        businessDomain: "冻结",
        dataItem: "冻结检查项8",
        ruleDescription:
            "针对冻结：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "BDG_025",
        businessDomain: "滚动预测",
        dataItem: "滚动预测检查项1",
        ruleDescription:
            "针对滚动预测：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "BDG_026",
        businessDomain: "滚动预测",
        dataItem: "滚动预测检查项2",
        ruleDescription:
            "针对滚动预测：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "BDG_027",
        businessDomain: "滚动预测",
        dataItem: "滚动预测检查项3",
        ruleDescription:
            "针对滚动预测：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "BDG_028",
        businessDomain: "滚动预测",
        dataItem: "滚动预测检查项4",
        ruleDescription:
            "针对滚动预测：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "BDG_029",
        businessDomain: "滚动预测",
        dataItem: "滚动预测检查项5",
        ruleDescription:
            "针对滚动预测：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "BDG_030",
        businessDomain: "滚动预测",
        dataItem: "滚动预测检查项6",
        ruleDescription:
            "针对滚动预测：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "BDG_031",
        businessDomain: "滚动预测",
        dataItem: "滚动预测检查项7",
        ruleDescription:
            "针对滚动预测：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "BDG_032",
        businessDomain: "滚动预测",
        dataItem: "滚动预测检查项8",
        ruleDescription:
            "针对滚动预测：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（预算执行监控自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const BDG_CATALOG_MARKER_RULE_ID = "BDG_032";
