/** Catalog version — bump when rule set changes. */
export const FCST_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type ForecastCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const FCST_CHECK_RULES_CATALOG: ForecastCheckRuleCatalogEntry[] = [
    {
        ruleId: "FCST_001",
        businessDomain: "预测准确率",
        dataItem: "预测准确率检查项1",
        ruleDescription:
            "针对预测准确率：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "FCST_002",
        businessDomain: "预测准确率",
        dataItem: "预测准确率检查项2",
        ruleDescription:
            "针对预测准确率：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "FCST_003",
        businessDomain: "预测准确率",
        dataItem: "预测准确率检查项3",
        ruleDescription:
            "针对预测准确率：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "FCST_004",
        businessDomain: "预测准确率",
        dataItem: "预测准确率检查项4",
        ruleDescription:
            "针对预测准确率：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "FCST_005",
        businessDomain: "预测准确率",
        dataItem: "预测准确率检查项5",
        ruleDescription:
            "针对预测准确率：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "FCST_006",
        businessDomain: "预测准确率",
        dataItem: "预测准确率检查项6",
        ruleDescription:
            "针对预测准确率：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "FCST_007",
        businessDomain: "预测准确率",
        dataItem: "预测准确率检查项7",
        ruleDescription:
            "针对预测准确率：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "FCST_008",
        businessDomain: "预测准确率",
        dataItem: "预测准确率检查项8",
        ruleDescription:
            "针对预测准确率：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "FCST_009",
        businessDomain: "偏差方向",
        dataItem: "偏差方向检查项1",
        ruleDescription:
            "针对偏差方向：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "FCST_010",
        businessDomain: "偏差方向",
        dataItem: "偏差方向检查项2",
        ruleDescription:
            "针对偏差方向：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "FCST_011",
        businessDomain: "偏差方向",
        dataItem: "偏差方向检查项3",
        ruleDescription:
            "针对偏差方向：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "FCST_012",
        businessDomain: "偏差方向",
        dataItem: "偏差方向检查项4",
        ruleDescription:
            "针对偏差方向：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "FCST_013",
        businessDomain: "偏差方向",
        dataItem: "偏差方向检查项5",
        ruleDescription:
            "针对偏差方向：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "FCST_014",
        businessDomain: "偏差方向",
        dataItem: "偏差方向检查项6",
        ruleDescription:
            "针对偏差方向：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "FCST_015",
        businessDomain: "偏差方向",
        dataItem: "偏差方向检查项7",
        ruleDescription:
            "针对偏差方向：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "FCST_016",
        businessDomain: "偏差方向",
        dataItem: "偏差方向检查项8",
        ruleDescription:
            "针对偏差方向：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "FCST_017",
        businessDomain: "新品预测",
        dataItem: "新品预测检查项1",
        ruleDescription:
            "针对新品预测：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "FCST_018",
        businessDomain: "新品预测",
        dataItem: "新品预测检查项2",
        ruleDescription:
            "针对新品预测：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "FCST_019",
        businessDomain: "新品预测",
        dataItem: "新品预测检查项3",
        ruleDescription:
            "针对新品预测：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "FCST_020",
        businessDomain: "新品预测",
        dataItem: "新品预测检查项4",
        ruleDescription:
            "针对新品预测：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "FCST_021",
        businessDomain: "新品预测",
        dataItem: "新品预测检查项5",
        ruleDescription:
            "针对新品预测：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "FCST_022",
        businessDomain: "新品预测",
        dataItem: "新品预测检查项6",
        ruleDescription:
            "针对新品预测：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "FCST_023",
        businessDomain: "新品预测",
        dataItem: "新品预测检查项7",
        ruleDescription:
            "针对新品预测：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "FCST_024",
        businessDomain: "新品预测",
        dataItem: "新品预测检查项8",
        ruleDescription:
            "针对新品预测：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "FCST_025",
        businessDomain: "季节因子",
        dataItem: "季节因子检查项1",
        ruleDescription:
            "针对季节因子：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "FCST_026",
        businessDomain: "季节因子",
        dataItem: "季节因子检查项2",
        ruleDescription:
            "针对季节因子：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "FCST_027",
        businessDomain: "季节因子",
        dataItem: "季节因子检查项3",
        ruleDescription:
            "针对季节因子：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "FCST_028",
        businessDomain: "季节因子",
        dataItem: "季节因子检查项4",
        ruleDescription:
            "针对季节因子：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "FCST_029",
        businessDomain: "季节因子",
        dataItem: "季节因子检查项5",
        ruleDescription:
            "针对季节因子：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "FCST_030",
        businessDomain: "季节因子",
        dataItem: "季节因子检查项6",
        ruleDescription:
            "针对季节因子：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "FCST_031",
        businessDomain: "季节因子",
        dataItem: "季节因子检查项7",
        ruleDescription:
            "针对季节因子：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "FCST_032",
        businessDomain: "季节因子",
        dataItem: "季节因子检查项8",
        ruleDescription:
            "针对季节因子：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（销售预测校准自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const FCST_CATALOG_MARKER_RULE_ID = "FCST_032";
