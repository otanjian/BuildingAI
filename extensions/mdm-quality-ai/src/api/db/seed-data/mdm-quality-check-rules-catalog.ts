/** Catalog version — bump when rule set changes. */
export const MDM_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type MdmQualityCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const MDM_CHECK_RULES_CATALOG: MdmQualityCheckRuleCatalogEntry[] = [
    {
        ruleId: "MDM_001",
        businessDomain: "物料主数据",
        dataItem: "物料编码",
        ruleDescription:
            "物料编码为空或含非法字符。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "MDM_002",
        businessDomain: "物料主数据",
        dataItem: "UOM",
        ruleDescription:
            "缺少基本单位或采购/销售单位换算。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "MDM_003",
        businessDomain: "物料主数据",
        dataItem: "物料描述",
        ruleDescription:
            "描述语言缺失或重复率 > 5%。",
        deductScore: 5,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "MDM_004",
        businessDomain: "物料主数据",
        dataItem: "重量体积",
        ruleDescription:
            "有库存记录但毛重/体积为 0。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "MDM_005",
        businessDomain: "物料主数据",
        dataItem: "条码",
        ruleDescription:
            "条码重复绑定多个物料。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "MDM_006",
        businessDomain: "物料主数据",
        dataItem: "生命周期",
        ruleDescription:
            "已淘汰物料状态仍为 Active。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "MDM_007",
        businessDomain: "物料主数据",
        dataItem: "分类",
        ruleDescription:
            "未分配物料组/品类。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "MDM_008",
        businessDomain: "物料主数据",
        dataItem: "图片",
        ruleDescription:
            "电商渠道物料无主图。",
        deductScore: 3,
        severity: "低",
    },
    {
        ruleId: "MDM_009",
        businessDomain: "客户主数据",
        dataItem: "税号",
        ruleDescription:
            "税号格式不符合地区规则。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "MDM_010",
        businessDomain: "客户主数据",
        dataItem: "信用",
        ruleDescription:
            "有敞口但未维护信用额度。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "MDM_011",
        businessDomain: "客户主数据",
        dataItem: "地址",
        ruleDescription:
            "默认收货地址缺失。",
        deductScore: 8,
        severity: "中",
        autoFix: true,
    },
    {
        ruleId: "MDM_012",
        businessDomain: "客户主数据",
        dataItem: "联系人",
        ruleDescription:
            "无有效联系人邮箱/电话。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "MDM_013",
        businessDomain: "客户主数据",
        dataItem: "重复客户",
        ruleDescription:
            "同名同税号疑似重复。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "MDM_014",
        businessDomain: "客户主数据",
        dataItem: "价格表",
        ruleDescription:
            "无默认价格表无法下单。",
        deductScore: 8,
        severity: "高",
    },
    {
        ruleId: "MDM_015",
        businessDomain: "客户主数据",
        dataItem: "行业",
        ruleDescription:
            "行业代码为空影响信评。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "MDM_016",
        businessDomain: "客户主数据",
        dataItem: "冻结",
        ruleDescription:
            "冻结客户仍有开放订单。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "MDM_017",
        businessDomain: "供应商主数据",
        dataItem: "银行账号",
        ruleDescription:
            "付款供应商无有效银行账号。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "MDM_018",
        businessDomain: "供应商主数据",
        dataItem: "资质",
        ruleDescription:
            "关键资质证书已过期。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "MDM_019",
        businessDomain: "供应商主数据",
        dataItem: "重复供应商",
        ruleDescription:
            "统一社会信用代码重复。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "MDM_020",
        businessDomain: "供应商主数据",
        dataItem: "付款条款",
        ruleDescription:
            "未维护默认付款条款。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "MDM_021",
        businessDomain: "供应商主数据",
        dataItem: "黑名单",
        ruleDescription:
            "黑名单供应商仍有 open PO。",
        deductScore: 15,
        severity: "高",
    },
    {
        ruleId: "MDM_022",
        businessDomain: "供应商主数据",
        dataItem: "币种",
        ruleDescription:
            "跨境供应商未维护交易币种。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "MDM_023",
        businessDomain: "供应商主数据",
        dataItem: "评级",
        ruleDescription:
            "无供应商绩效评分记录。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "MDM_024",
        businessDomain: "供应商主数据",
        dataItem: "联系人",
        ruleDescription:
            "采购联系人缺失。",
        deductScore: 5,
        severity: "低",
        autoFix: true,
    },
    {
        ruleId: "MDM_025",
        businessDomain: "BOM 主数据",
        dataItem: "循环 BOM",
        ruleDescription:
            "BOM 展开存在循环引用。",
        deductScore: 15,
        severity: "高",
    },
    {
        ruleId: "MDM_026",
        businessDomain: "BOM 主数据",
        dataItem: "组件失效",
        ruleDescription:
            "子件已淘汰仍挂在有效 BOM。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "MDM_027",
        businessDomain: "BOM 主数据",
        dataItem: "用量为0",
        ruleDescription:
            "组件用量为 0 或负数。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "MDM_028",
        businessDomain: "BOM 主数据",
        dataItem: "版本",
        ruleDescription:
            "生产工单引用非当前有效 BOM 版本。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "MDM_029",
        businessDomain: "BOM 主数据",
        dataItem: "替代料",
        ruleDescription:
            "主件缺料无替代策略。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "MDM_030",
        businessDomain: "BOM 主数据",
        dataItem: "虚拟件",
        ruleDescription:
            "虚拟件下挂实物但未配置发料点。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "MDM_031",
        businessDomain: "BOM 主数据",
        dataItem: "损耗率",
        ruleDescription:
            "损耗率 > 50% 异常。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "MDM_032",
        businessDomain: "BOM 主数据",
        dataItem: "单位",
        ruleDescription:
            "子件单位与父件不可换算。",
        deductScore: 10,
        severity: "高",
    },
];

export const MDM_CATALOG_MARKER_RULE_ID = "MDM_032";
