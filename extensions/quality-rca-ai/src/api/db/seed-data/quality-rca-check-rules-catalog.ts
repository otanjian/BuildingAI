/** Catalog version — bump when rule set changes. */
export const QRCA_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type QualityRcaCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const QRCA_CHECK_RULES_CATALOG: QualityRcaCheckRuleCatalogEntry[] = [
    {
        ruleId: "QA_001",
        businessDomain: "来料检验",
        dataItem: "来料检验检查项1",
        ruleDescription:
            "针对来料检验：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "QA_002",
        businessDomain: "来料检验",
        dataItem: "来料检验检查项2",
        ruleDescription:
            "针对来料检验：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "QA_003",
        businessDomain: "来料检验",
        dataItem: "来料检验检查项3",
        ruleDescription:
            "针对来料检验：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "QA_004",
        businessDomain: "来料检验",
        dataItem: "来料检验检查项4",
        ruleDescription:
            "针对来料检验：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "QA_005",
        businessDomain: "来料检验",
        dataItem: "来料检验检查项5",
        ruleDescription:
            "针对来料检验：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "QA_006",
        businessDomain: "来料检验",
        dataItem: "来料检验检查项6",
        ruleDescription:
            "针对来料检验：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "QA_007",
        businessDomain: "来料检验",
        dataItem: "来料检验检查项7",
        ruleDescription:
            "针对来料检验：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "QA_008",
        businessDomain: "来料检验",
        dataItem: "来料检验检查项8",
        ruleDescription:
            "针对来料检验：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "QA_009",
        businessDomain: "制程质量",
        dataItem: "制程质量检查项1",
        ruleDescription:
            "针对制程质量：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "QA_010",
        businessDomain: "制程质量",
        dataItem: "制程质量检查项2",
        ruleDescription:
            "针对制程质量：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "QA_011",
        businessDomain: "制程质量",
        dataItem: "制程质量检查项3",
        ruleDescription:
            "针对制程质量：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "QA_012",
        businessDomain: "制程质量",
        dataItem: "制程质量检查项4",
        ruleDescription:
            "针对制程质量：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "QA_013",
        businessDomain: "制程质量",
        dataItem: "制程质量检查项5",
        ruleDescription:
            "针对制程质量：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "QA_014",
        businessDomain: "制程质量",
        dataItem: "制程质量检查项6",
        ruleDescription:
            "针对制程质量：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "QA_015",
        businessDomain: "制程质量",
        dataItem: "制程质量检查项7",
        ruleDescription:
            "针对制程质量：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "QA_016",
        businessDomain: "制程质量",
        dataItem: "制程质量检查项8",
        ruleDescription:
            "针对制程质量：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "QA_017",
        businessDomain: "客诉",
        dataItem: "客诉检查项1",
        ruleDescription:
            "针对客诉：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "QA_018",
        businessDomain: "客诉",
        dataItem: "客诉检查项2",
        ruleDescription:
            "针对客诉：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "QA_019",
        businessDomain: "客诉",
        dataItem: "客诉检查项3",
        ruleDescription:
            "针对客诉：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "QA_020",
        businessDomain: "客诉",
        dataItem: "客诉检查项4",
        ruleDescription:
            "针对客诉：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "QA_021",
        businessDomain: "客诉",
        dataItem: "客诉检查项5",
        ruleDescription:
            "针对客诉：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "QA_022",
        businessDomain: "客诉",
        dataItem: "客诉检查项6",
        ruleDescription:
            "针对客诉：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "QA_023",
        businessDomain: "客诉",
        dataItem: "客诉检查项7",
        ruleDescription:
            "针对客诉：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "QA_024",
        businessDomain: "客诉",
        dataItem: "客诉检查项8",
        ruleDescription:
            "针对客诉：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "QA_025",
        businessDomain: "批次追溯",
        dataItem: "批次追溯检查项1",
        ruleDescription:
            "针对批次追溯：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "QA_026",
        businessDomain: "批次追溯",
        dataItem: "批次追溯检查项2",
        ruleDescription:
            "针对批次追溯：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "QA_027",
        businessDomain: "批次追溯",
        dataItem: "批次追溯检查项3",
        ruleDescription:
            "针对批次追溯：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "QA_028",
        businessDomain: "批次追溯",
        dataItem: "批次追溯检查项4",
        ruleDescription:
            "针对批次追溯：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "QA_029",
        businessDomain: "批次追溯",
        dataItem: "批次追溯检查项5",
        ruleDescription:
            "针对批次追溯：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "QA_030",
        businessDomain: "批次追溯",
        dataItem: "批次追溯检查项6",
        ruleDescription:
            "针对批次追溯：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "QA_031",
        businessDomain: "批次追溯",
        dataItem: "批次追溯检查项7",
        ruleDescription:
            "针对批次追溯：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "QA_032",
        businessDomain: "批次追溯",
        dataItem: "批次追溯检查项8",
        ruleDescription:
            "针对批次追溯：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（质量异常追溯自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const QRCA_CATALOG_MARKER_RULE_ID = "QA_032";
