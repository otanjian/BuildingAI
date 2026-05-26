/** Catalog version — bump when rule set changes. */
export const OTIF_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type OtifCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const OTIF_CHECK_RULES_CATALOG: OtifCheckRuleCatalogEntry[] = [
    {
        ruleId: "OTIF_001",
        businessDomain: "交付准时",
        dataItem: "交付准时检查项1",
        ruleDescription:
            "针对交付准时：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 5,
        severity: "高",
    },
    {
        ruleId: "OTIF_002",
        businessDomain: "交付准时",
        dataItem: "交付准时检查项2",
        ruleDescription:
            "针对交付准时：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "OTIF_003",
        businessDomain: "交付准时",
        dataItem: "交付准时检查项3",
        ruleDescription:
            "针对交付准时：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "OTIF_004",
        businessDomain: "交付准时",
        dataItem: "交付准时检查项4",
        ruleDescription:
            "针对交付准时：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "OTIF_005",
        businessDomain: "交付准时",
        dataItem: "交付准时检查项5",
        ruleDescription:
            "针对交付准时：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "OTIF_006",
        businessDomain: "交付准时",
        dataItem: "交付准时检查项6",
        ruleDescription:
            "针对交付准时：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "OTIF_007",
        businessDomain: "交付准时",
        dataItem: "交付准时检查项7",
        ruleDescription:
            "针对交付准时：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "OTIF_008",
        businessDomain: "交付准时",
        dataItem: "交付准时检查项8",
        ruleDescription:
            "针对交付准时：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 9,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "OTIF_009",
        businessDomain: "齐套率",
        dataItem: "齐套率检查项1",
        ruleDescription:
            "针对齐套率：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 7,
        severity: "低",
    },
    {
        ruleId: "OTIF_010",
        businessDomain: "齐套率",
        dataItem: "齐套率检查项2",
        ruleDescription:
            "针对齐套率：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "OTIF_011",
        businessDomain: "齐套率",
        dataItem: "齐套率检查项3",
        ruleDescription:
            "针对齐套率：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "OTIF_012",
        businessDomain: "齐套率",
        dataItem: "齐套率检查项4",
        ruleDescription:
            "针对齐套率：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "OTIF_013",
        businessDomain: "齐套率",
        dataItem: "齐套率检查项5",
        ruleDescription:
            "针对齐套率：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "OTIF_014",
        businessDomain: "齐套率",
        dataItem: "齐套率检查项6",
        ruleDescription:
            "针对齐套率：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "OTIF_015",
        businessDomain: "齐套率",
        dataItem: "齐套率检查项7",
        ruleDescription:
            "针对齐套率：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "OTIF_016",
        businessDomain: "齐套率",
        dataItem: "齐套率检查项8",
        ruleDescription:
            "针对齐套率：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "OTIF_017",
        businessDomain: "供应商绩效",
        dataItem: "供应商绩效检查项1",
        ruleDescription:
            "针对供应商绩效：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 9,
        severity: "中",
    },
    {
        ruleId: "OTIF_018",
        businessDomain: "供应商绩效",
        dataItem: "供应商绩效检查项2",
        ruleDescription:
            "针对供应商绩效：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "OTIF_019",
        businessDomain: "供应商绩效",
        dataItem: "供应商绩效检查项3",
        ruleDescription:
            "针对供应商绩效：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "OTIF_020",
        businessDomain: "供应商绩效",
        dataItem: "供应商绩效检查项4",
        ruleDescription:
            "针对供应商绩效：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "OTIF_021",
        businessDomain: "供应商绩效",
        dataItem: "供应商绩效检查项5",
        ruleDescription:
            "针对供应商绩效：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "OTIF_022",
        businessDomain: "供应商绩效",
        dataItem: "供应商绩效检查项6",
        ruleDescription:
            "针对供应商绩效：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "OTIF_023",
        businessDomain: "供应商绩效",
        dataItem: "供应商绩效检查项7",
        ruleDescription:
            "针对供应商绩效：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "OTIF_024",
        businessDomain: "供应商绩效",
        dataItem: "供应商绩效检查项8",
        ruleDescription:
            "针对供应商绩效：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "OTIF_025",
        businessDomain: "关键物料",
        dataItem: "关键物料检查项1",
        ruleDescription:
            "针对关键物料：检查项1——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 11,
        severity: "低",
    },
    {
        ruleId: "OTIF_026",
        businessDomain: "关键物料",
        dataItem: "关键物料检查项2",
        ruleDescription:
            "针对关键物料：检查项2——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 13,
        severity: "高",
    },
    {
        ruleId: "OTIF_027",
        businessDomain: "关键物料",
        dataItem: "关键物料检查项3",
        ruleDescription:
            "针对关键物料：检查项3——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "OTIF_028",
        businessDomain: "关键物料",
        dataItem: "关键物料检查项4",
        ruleDescription:
            "针对关键物料：检查项4——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 7,
        severity: "中",
    },
    {
        ruleId: "OTIF_029",
        businessDomain: "关键物料",
        dataItem: "关键物料检查项5",
        ruleDescription:
            "针对关键物料：检查项5——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 9,
        severity: "低",
    },
    {
        ruleId: "OTIF_030",
        businessDomain: "关键物料",
        dataItem: "关键物料检查项6",
        ruleDescription:
            "针对关键物料：检查项6——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 11,
        severity: "高",
    },
    {
        ruleId: "OTIF_031",
        businessDomain: "关键物料",
        dataItem: "关键物料检查项7",
        ruleDescription:
            "针对关键物料：检查项7——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 13,
        severity: "低",
    },
    {
        ruleId: "OTIF_032",
        businessDomain: "关键物料",
        dataItem: "关键物料检查项8",
        ruleDescription:
            "针对关键物料：检查项8——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（供应链 OTIF 自治）。",
        deductScore: 5,
        severity: "中",
    },
];

export const OTIF_CATALOG_MARKER_RULE_ID = "OTIF_032";
