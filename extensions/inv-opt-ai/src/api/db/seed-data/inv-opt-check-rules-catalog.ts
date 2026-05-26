/** Catalog version — bump when rule set changes. */
export const INVO_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type InvOptCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const INVO_CHECK_RULES_CATALOG: InvOptCheckRuleCatalogEntry[] = [
    {
        ruleId: "INV_001",
        businessDomain: "库存策略",
        dataItem: "安全库存",
        ruleDescription:
            "当前可用库存 < 安全库存(SS) 且采购提前期 > 7 天时标记缺货风险。",
        deductScore: 15,
        severity: "高",
    },
    {
        ruleId: "INV_002",
        businessDomain: "库存策略",
        dataItem: "再订货点",
        ruleDescription:
            "系统 ROP 与公式 SS+LT×日均需求 偏差 > 20% 时提示参数失效。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "INV_003",
        businessDomain: "库存策略",
        dataItem: "呆滞库存",
        ruleDescription:
            "365 天无出库且库存金额 > 10000 的物料标记呆滞。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "INV_004",
        businessDomain: "库存策略",
        dataItem: "缺货风险",
        ruleDescription:
            "开放销售订单需求 > 可用库存 + 在途采购数量。",
        deductScore: 15,
        severity: "高",
    },
    {
        ruleId: "INV_005",
        businessDomain: "库存策略",
        dataItem: "ABC 分类",
        ruleDescription:
            "A 类物料未配置安全库存或 ROP 时告警。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "INV_006",
        businessDomain: "库存策略",
        dataItem: "批次效期",
        ruleDescription:
            "距失效日期 < 30 天且库存量 > 0 的批次需预警。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "INV_007",
        businessDomain: "库存策略",
        dataItem: "负库存",
        ruleDescription:
            "任意仓库物料账面库存 < 0 且无在途调整单。",
        deductScore: 12,
        severity: "高",
    },
    {
        ruleId: "INV_008",
        businessDomain: "库存策略",
        dataItem: "安全库存为零",
        ruleDescription:
            "有连续 90 天出库的物料安全库存为 0。",
        deductScore: 8,
        severity: "中",
        autoFix: true,
    },
    {
        ruleId: "INV_009",
        businessDomain: "采购参数",
        dataItem: "EOQ",
        ruleDescription:
            "经济批量 EOQ 与实际 MOQ 采购经济性偏差 > 50% 年度损失 > 5000 元。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "INV_010",
        businessDomain: "采购参数",
        dataItem: "最小订货量",
        ruleDescription:
            "MOQ 导致单次订货覆盖天数 > 180 天。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "INV_011",
        businessDomain: "采购参数",
        dataItem: "采购提前期",
        ruleDescription:
            "Item 提前期为 0 但存在外购供应。",
        deductScore: 5,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "INV_012",
        businessDomain: "采购参数",
        dataItem: "供应商交期",
        ruleDescription:
            "实际收货日期晚于 PO 承诺日 > 5 天且为关键件。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "INV_013",
        businessDomain: "采购参数",
        dataItem: "价格有效",
        ruleDescription:
            "有效采购价目表缺失导致 PO 无价格。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "INV_014",
        businessDomain: "采购参数",
        dataItem: "重复 PO",
        ruleDescription:
            "同一物料 7 天内重复下达金额相近 PO。",
        deductScore: 6,
        severity: "中",
    },
    {
        ruleId: "INV_015",
        businessDomain: "采购参数",
        dataItem: "订货倍数",
        ruleDescription:
            "订货倍数与包装规格不一致导致拆包损耗。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "INV_016",
        businessDomain: "采购参数",
        dataItem: "寄售库存",
        ruleDescription:
            "寄售物料未按协议周期对账。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "INV_017",
        businessDomain: "需求预测",
        dataItem: "预测偏差",
        ruleDescription:
            "近 3 月实际消耗与预测偏差 > 30% 且方向一致。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "INV_018",
        businessDomain: "需求预测",
        dataItem: "季节性",
        ruleDescription:
            "季节性物料未配置季节因子。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "INV_019",
        businessDomain: "需求预测",
        dataItem: "新品预测",
        ruleDescription:
            "上市 < 90 天物料无预测仍按默认系数。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "INV_020",
        businessDomain: "需求预测",
        dataItem: "促销 spike",
        ruleDescription:
            "促销期未上调预测导致缺货。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "INV_021",
        businessDomain: "需求预测",
        dataItem: "BOM 需求",
        ruleDescription:
            "父件预测存在但子件无依赖展开。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "INV_022",
        businessDomain: "需求预测",
        dataItem: "预测冻结",
        ruleDescription:
            "已冻结预测版本仍被 MRP 引用。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "INV_023",
        businessDomain: "需求预测",
        dataItem: "单位换算",
        ruleDescription:
            "预测单位与销售单位未维护换算。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "INV_024",
        businessDomain: "仓储执行",
        dataItem: "货位匹配",
        ruleDescription:
            "物料默认货位在仓库主数据中不存在或已禁用。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "INV_025",
        businessDomain: "仓储执行",
        dataItem: "盘点差异",
        ruleDescription:
            "上次盘点差异未过账调整 > 30 天。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "INV_026",
        businessDomain: "仓储执行",
        dataItem: "拣货短缺",
        ruleDescription:
            "拣货单短缺行未关闭 > 3 天。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "INV_027",
        businessDomain: "仓储执行",
        dataItem: "库龄",
        ruleDescription:
            "库龄 > 180 天金额占比 > 10%。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "INV_028",
        businessDomain: "仓储执行",
        dataItem: "温区",
        ruleDescription:
            "冷链物料存放在非温控货位。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "INV_029",
        businessDomain: "仓储执行",
        dataItem: "循环盘点",
        ruleDescription:
            "A 类物料超过 90 天未盘点。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "INV_030",
        businessDomain: "仓储执行",
        dataItem: "收发未过账",
        ruleDescription:
            "收货单已过账 7 天仍未入库账务。",
        deductScore: 8,
        severity: "中",
    },
];

export const INVO_CATALOG_MARKER_RULE_ID = "INV_030";
