/** Catalog version — bump when rule set changes. */
export const PROC_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type ProcAuditCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const PROC_CHECK_RULES_CATALOG: ProcAuditCheckRuleCatalogEntry[] = [
    {
        ruleId: "PROC_001",
        businessDomain: "价格合规",
        dataItem: "价格突变",
        ruleDescription:
            "同物料 30 天内采购价波动 > 15%。",
        deductScore: 12,
        severity: "高",
    },
    {
        ruleId: "PROC_002",
        businessDomain: "价格合规",
        dataItem: "价目失效",
        ruleDescription:
            "PO 引用已过期价目表。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_003",
        businessDomain: "价格合规",
        dataItem: "最低价",
        ruleDescription:
            "未选最低价供应商且无审批。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_004",
        businessDomain: "价格合规",
        dataItem: "币种",
        ruleDescription:
            "PO 币种与价目表不一致。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "PROC_005",
        businessDomain: "价格合规",
        dataItem: "折扣",
        ruleDescription:
            "行折扣 > 政策上限。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "PROC_006",
        businessDomain: "价格合规",
        dataItem: "运费",
        ruleDescription:
            "运费未按合同分摊到行。",
        deductScore: 5,
        severity: "低",
    },
    {
        ruleId: "PROC_007",
        businessDomain: "价格合规",
        dataItem: "竞价",
        ruleDescription:
            "应竞价物料直接指定供应商。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_008",
        businessDomain: "价格合规",
        dataItem: "历史价",
        ruleDescription:
            "高于历史均价 20% 无说明。",
        deductScore: 12,
        severity: "高",
    },
    {
        ruleId: "PROC_009",
        businessDomain: "审批链",
        dataItem: "金额阈值",
        ruleDescription:
            "超阈值 PO 无二级审批。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_010",
        businessDomain: "审批链",
        dataItem: "自审批",
        ruleDescription:
            "创建人与审批人相同。",
        deductScore: 12,
        severity: "高",
    },
    {
        ruleId: "PROC_011",
        businessDomain: "审批链",
        dataItem: "拆单",
        ruleDescription:
            "疑似拆单规避审批阈值。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_012",
        businessDomain: "审批链",
        dataItem: "紧急采购",
        ruleDescription:
            "紧急 PO 无事后补批。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "PROC_013",
        businessDomain: "审批链",
        dataItem: "合同",
        ruleDescription:
            "无框架合同单笔超 50 万。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_014",
        businessDomain: "审批链",
        dataItem: "权限",
        ruleDescription:
            "审批人角色与金额权限不匹配。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_015",
        businessDomain: "审批链",
        dataItem: "时效",
        ruleDescription:
            "审批滞留 > 5 工作日。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "PROC_016",
        businessDomain: "审批链",
        dataItem: "撤回",
        ruleDescription:
            "已审批 PO 频繁修改未重审。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "PROC_017",
        businessDomain: "供应商",
        dataItem: "集中度",
        ruleDescription:
            "单一供应商采购额占比 > 40%。",
        deductScore: 6,
        severity: "中",
    },
    {
        ruleId: "PROC_018",
        businessDomain: "供应商",
        dataItem: "资质",
        ruleDescription:
            "供应商证照过期仍下单。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_019",
        businessDomain: "供应商",
        dataItem: "黑名单",
        ruleDescription:
            "黑名单供应商 open PO。",
        deductScore: 15,
        severity: "高",
    },
    {
        ruleId: "PROC_020",
        businessDomain: "供应商",
        dataItem: "新供应商",
        ruleDescription:
            "新供应商首单 > 100 万无试单。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_021",
        businessDomain: "供应商",
        dataItem: "关联",
        ruleDescription:
            "疑似关联供应商围标。",
        deductScore: 12,
        severity: "高",
    },
    {
        ruleId: "PROC_022",
        businessDomain: "供应商",
        dataItem: "绩效",
        ruleDescription:
            "D 级供应商仍占采购额 > 10%。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "PROC_023",
        businessDomain: "供应商",
        dataItem: "银行",
        ruleDescription:
            "收款账号近期变更未复核。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_024",
        businessDomain: "供应商",
        dataItem: "贸易",
        ruleDescription:
            "跨境供应商无贸易合规筛查。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "PROC_025",
        businessDomain: "三单匹配",
        dataItem: "数量",
        ruleDescription:
            "发票数量与收货数量差异 > 2%。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_026",
        businessDomain: "三单匹配",
        dataItem: "金额",
        ruleDescription:
            "发票金额与 PO 差异 > 1%。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "PROC_027",
        businessDomain: "三单匹配",
        dataItem: "无 PO",
        ruleDescription:
            "发票无关联 PO。",
        deductScore: 12,
        severity: "高",
    },
    {
        ruleId: "PROC_028",
        businessDomain: "三单匹配",
        dataItem: "无收货",
        ruleDescription:
            "发票已过账无 GRN。",
        deductScore: 12,
        severity: "高",
    },
    {
        ruleId: "PROC_029",
        businessDomain: "三单匹配",
        dataItem: "预付款",
        ruleDescription:
            "预付款未核销 > 90 天。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "PROC_030",
        businessDomain: "三单匹配",
        dataItem: "退货",
        ruleDescription:
            "退货未冲减应付。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "PROC_031",
        businessDomain: "三单匹配",
        dataItem: "税码",
        ruleDescription:
            "发票税码与 PO 不一致。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "PROC_032",
        businessDomain: "三单匹配",
        dataItem: "重复发票",
        ruleDescription:
            "同号发票重复入账。",
        deductScore: 15,
        severity: "高",
    },
];

export const PROC_CATALOG_MARKER_RULE_ID = "PROC_032";
