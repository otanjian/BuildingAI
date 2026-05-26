/**
 * Domain-specific rule templates (≥30 per app).
 * Each template: { dataItem, ruleDescription, deductScore, severity, autoFix? }
 */

const genericTemplates = (domain, items) =>
    items.map((t) => ({ businessDomain: domain, ...t }));

function padId(prefix, n) {
    return `${prefix}_${String(n).padStart(3, "0")}`;
}

export function buildRulesForApp(app) {
    ensureAppDomainRules(app);
    const { rulePrefix, businessDomains: domains } = app;
    const rules = [];
    let n = 1;

    const add = (domain, dataItem, ruleDescription, deductScore, severity, autoFix = false) => {
        rules.push({
            ruleId: padId(rulePrefix, n++),
            businessDomain: domain,
            dataItem,
            ruleDescription,
            deductScore,
            severity,
            autoFix,
            enabled: false,
        });
    };

    const domainRules = APP_DOMAIN_RULES[app.appId] ?? APP_DOMAIN_RULES._default;
    for (const block of domainRules) {
        for (const t of block.templates) {
            add(block.domain, t.dataItem, t.ruleDescription, t.deductScore, t.severity, t.autoFix ?? false);
        }
    }

    while (rules.length < 30) {
        const d = domains[rules.length % domains.length];
        add(
            d,
            `${d}扩展检查项${rules.length + 1}`,
            `对${d}相关主数据与交易记录执行完整性、一致性与时效性校验；异常阈值按企业标准配置。`,
            5 + (rules.length % 3) * 2,
            rules.length % 5 === 0 ? "高" : rules.length % 2 === 0 ? "中" : "低",
        );
    }

    const final = rules.slice(0, Math.max(30, rules.length));
    final.forEach((r, i) => {
        r.ruleId = padId(rulePrefix, i + 1);
        r.enabled = i === 0 || i === 2 || i === 6;
    });
    return final;
}

const APP_DOMAIN_RULES = {
    "inv-opt-ai": [
        {
            domain: "库存策略",
            templates: [
                { dataItem: "安全库存", ruleDescription: "当前可用库存 < 安全库存(SS) 且采购提前期 > 7 天时标记缺货风险。", deductScore: 15, severity: "高" },
                { dataItem: "再订货点", ruleDescription: "系统 ROP 与公式 SS+LT×日均需求 偏差 > 20% 时提示参数失效。", deductScore: 8, severity: "中" },
                { dataItem: "呆滞库存", ruleDescription: "365 天无出库且库存金额 > 10000 的物料标记呆滞。", deductScore: 5, severity: "低" },
                { dataItem: "缺货风险", ruleDescription: "开放销售订单需求 > 可用库存 + 在途采购数量。", deductScore: 15, severity: "高" },
                { dataItem: "ABC 分类", ruleDescription: "A 类物料未配置安全库存或 ROP 时告警。", deductScore: 10, severity: "高" },
                { dataItem: "批次效期", ruleDescription: "距失效日期 < 30 天且库存量 > 0 的批次需预警。", deductScore: 8, severity: "中" },
                { dataItem: "负库存", ruleDescription: "任意仓库物料账面库存 < 0 且无在途调整单。", deductScore: 12, severity: "高" },
                { dataItem: "安全库存为零", ruleDescription: "有连续 90 天出库的物料安全库存为 0。", deductScore: 8, severity: "中", autoFix: true },
            ],
        },
        {
            domain: "采购参数",
            templates: [
                { dataItem: "EOQ", ruleDescription: "经济批量 EOQ 与实际 MOQ 采购经济性偏差 > 50% 年度损失 > 5000 元。", deductScore: 8, severity: "中" },
                { dataItem: "最小订货量", ruleDescription: "MOQ 导致单次订货覆盖天数 > 180 天。", deductScore: 8, severity: "中" },
                { dataItem: "采购提前期", ruleDescription: "Item 提前期为 0 但存在外购供应。", deductScore: 5, severity: "低", autoFix: true },
                { dataItem: "供应商交期", ruleDescription: "实际收货日期晚于 PO 承诺日 > 5 天且为关键件。", deductScore: 10, severity: "高" },
                { dataItem: "价格有效", ruleDescription: "有效采购价目表缺失导致 PO 无价格。", deductScore: 8, severity: "中" },
                { dataItem: "重复 PO", ruleDescription: "同一物料 7 天内重复下达金额相近 PO。", deductScore: 6, severity: "中" },
                { dataItem: "订货倍数", ruleDescription: "订货倍数与包装规格不一致导致拆包损耗。", deductScore: 5, severity: "低" },
                { dataItem: "寄售库存", ruleDescription: "寄售物料未按协议周期对账。", deductScore: 5, severity: "低" },
            ],
        },
        {
            domain: "需求预测",
            templates: [
                { dataItem: "预测偏差", ruleDescription: "近 3 月实际消耗与预测偏差 > 30% 且方向一致。", deductScore: 8, severity: "中" },
                { dataItem: "季节性", ruleDescription: "季节性物料未配置季节因子。", deductScore: 5, severity: "低" },
                { dataItem: "新品预测", ruleDescription: "上市 < 90 天物料无预测仍按默认系数。", deductScore: 8, severity: "中" },
                { dataItem: "促销 spike", ruleDescription: "促销期未上调预测导致缺货。", deductScore: 10, severity: "高" },
                { dataItem: "BOM 需求", ruleDescription: "父件预测存在但子件无依赖展开。", deductScore: 8, severity: "中" },
                { dataItem: "预测冻结", ruleDescription: "已冻结预测版本仍被 MRP 引用。", deductScore: 5, severity: "低" },
                { dataItem: "单位换算", ruleDescription: "预测单位与销售单位未维护换算。", deductScore: 5, severity: "低" },
            ],
        },
        {
            domain: "仓储执行",
            templates: [
                { dataItem: "货位匹配", ruleDescription: "物料默认货位在仓库主数据中不存在或已禁用。", deductScore: 5, severity: "中" },
                { dataItem: "盘点差异", ruleDescription: "上次盘点差异未过账调整 > 30 天。", deductScore: 8, severity: "中" },
                { dataItem: "拣货短缺", ruleDescription: "拣货单短缺行未关闭 > 3 天。", deductScore: 8, severity: "中" },
                { dataItem: "库龄", ruleDescription: "库龄 > 180 天金额占比 > 10%。", deductScore: 5, severity: "低" },
                { dataItem: "温区", ruleDescription: "冷链物料存放在非温控货位。", deductScore: 10, severity: "高" },
                { dataItem: "循环盘点", ruleDescription: "A 类物料超过 90 天未盘点。", deductScore: 5, severity: "低" },
                { dataItem: "收发未过账", ruleDescription: "收货单已过账 7 天仍未入库账务。", deductScore: 8, severity: "中" },
            ],
        },
    ],
    "mdm-quality-ai": [
        {
            domain: "物料主数据",
            templates: genericTemplates("物料主数据", [
                { dataItem: "物料编码", ruleDescription: "物料编码为空或含非法字符。", deductScore: 10, severity: "高" },
                { dataItem: "UOM", ruleDescription: "缺少基本单位或采购/销售单位换算。", deductScore: 10, severity: "高" },
                { dataItem: "物料描述", ruleDescription: "描述语言缺失或重复率 > 5%。", deductScore: 5, severity: "低", autoFix: true },
                { dataItem: "重量体积", ruleDescription: "有库存记录但毛重/体积为 0。", deductScore: 5, severity: "中" },
                { dataItem: "条码", ruleDescription: "条码重复绑定多个物料。", deductScore: 10, severity: "高" },
                { dataItem: "生命周期", ruleDescription: "已淘汰物料状态仍为 Active。", deductScore: 8, severity: "中" },
                { dataItem: "分类", ruleDescription: "未分配物料组/品类。", deductScore: 5, severity: "低" },
                { dataItem: "图片", ruleDescription: "电商渠道物料无主图。", deductScore: 3, severity: "低" },
            ]),
        },
        {
            domain: "客户主数据",
            templates: genericTemplates("客户主数据", [
                { dataItem: "税号", ruleDescription: "税号格式不符合地区规则。", deductScore: 10, severity: "高" },
                { dataItem: "信用", ruleDescription: "有敞口但未维护信用额度。", deductScore: 10, severity: "高" },
                { dataItem: "地址", ruleDescription: "默认收货地址缺失。", deductScore: 8, severity: "中", autoFix: true },
                { dataItem: "联系人", ruleDescription: "无有效联系人邮箱/电话。", deductScore: 5, severity: "中" },
                { dataItem: "重复客户", ruleDescription: "同名同税号疑似重复。", deductScore: 8, severity: "中" },
                { dataItem: "价格表", ruleDescription: "无默认价格表无法下单。", deductScore: 8, severity: "高" },
                { dataItem: "行业", ruleDescription: "行业代码为空影响信评。", deductScore: 5, severity: "低" },
                { dataItem: "冻结", ruleDescription: "冻结客户仍有开放订单。", deductScore: 10, severity: "高" },
            ]),
        },
        {
            domain: "供应商主数据",
            templates: genericTemplates("供应商主数据", [
                { dataItem: "银行账号", ruleDescription: "付款供应商无有效银行账号。", deductScore: 10, severity: "高" },
                { dataItem: "资质", ruleDescription: "关键资质证书已过期。", deductScore: 10, severity: "高" },
                { dataItem: "重复供应商", ruleDescription: "统一社会信用代码重复。", deductScore: 8, severity: "中" },
                { dataItem: "付款条款", ruleDescription: "未维护默认付款条款。", deductScore: 8, severity: "中" },
                { dataItem: "黑名单", ruleDescription: "黑名单供应商仍有 open PO。", deductScore: 15, severity: "高" },
                { dataItem: "币种", ruleDescription: "跨境供应商未维护交易币种。", deductScore: 5, severity: "中" },
                { dataItem: "评级", ruleDescription: "无供应商绩效评分记录。", deductScore: 5, severity: "低" },
                { dataItem: "联系人", ruleDescription: "采购联系人缺失。", deductScore: 5, severity: "低", autoFix: true },
            ]),
        },
        {
            domain: "BOM 主数据",
            templates: genericTemplates("BOM 主数据", [
                { dataItem: "循环 BOM", ruleDescription: "BOM 展开存在循环引用。", deductScore: 15, severity: "高" },
                { dataItem: "组件失效", ruleDescription: "子件已淘汰仍挂在有效 BOM。", deductScore: 10, severity: "高" },
                { dataItem: "用量为0", ruleDescription: "组件用量为 0 或负数。", deductScore: 10, severity: "高" },
                { dataItem: "版本", ruleDescription: "生产工单引用非当前有效 BOM 版本。", deductScore: 8, severity: "中" },
                { dataItem: "替代料", ruleDescription: "主件缺料无替代策略。", deductScore: 8, severity: "中" },
                { dataItem: "虚拟件", ruleDescription: "虚拟件下挂实物但未配置发料点。", deductScore: 5, severity: "中" },
                { dataItem: "损耗率", ruleDescription: "损耗率 > 50% 异常。", deductScore: 5, severity: "低" },
                { dataItem: "单位", ruleDescription: "子件单位与父件不可换算。", deductScore: 10, severity: "高" },
            ]),
        },
    ],
    "proc-audit-ai": [
        {
            domain: "价格合规",
            templates: genericTemplates("价格合规", [
                { dataItem: "价格突变", ruleDescription: "同物料 30 天内采购价波动 > 15%。", deductScore: 12, severity: "高" },
                { dataItem: "价目失效", ruleDescription: "PO 引用已过期价目表。", deductScore: 10, severity: "高" },
                { dataItem: "最低价", ruleDescription: "未选最低价供应商且无审批。", deductScore: 10, severity: "高" },
                { dataItem: "币种", ruleDescription: "PO 币种与价目表不一致。", deductScore: 8, severity: "中" },
                { dataItem: "折扣", ruleDescription: "行折扣 > 政策上限。", deductScore: 8, severity: "中" },
                { dataItem: "运费", ruleDescription: "运费未按合同分摊到行。", deductScore: 5, severity: "低" },
                { dataItem: "竞价", ruleDescription: "应竞价物料直接指定供应商。", deductScore: 10, severity: "高" },
                { dataItem: "历史价", ruleDescription: "高于历史均价 20% 无说明。", deductScore: 12, severity: "高" },
            ]),
        },
        {
            domain: "审批链",
            templates: genericTemplates("审批链", [
                { dataItem: "金额阈值", ruleDescription: "超阈值 PO 无二级审批。", deductScore: 10, severity: "高" },
                { dataItem: "自审批", ruleDescription: "创建人与审批人相同。", deductScore: 12, severity: "高" },
                { dataItem: "拆单", ruleDescription: "疑似拆单规避审批阈值。", deductScore: 10, severity: "高" },
                { dataItem: "紧急采购", ruleDescription: "紧急 PO 无事后补批。", deductScore: 8, severity: "中" },
                { dataItem: "合同", ruleDescription: "无框架合同单笔超 50 万。", deductScore: 10, severity: "高" },
                { dataItem: "权限", ruleDescription: "审批人角色与金额权限不匹配。", deductScore: 10, severity: "高" },
                { dataItem: "时效", ruleDescription: "审批滞留 > 5 工作日。", deductScore: 5, severity: "中" },
                { dataItem: "撤回", ruleDescription: "已审批 PO 频繁修改未重审。", deductScore: 8, severity: "中" },
            ]),
        },
        {
            domain: "供应商",
            templates: genericTemplates("供应商", [
                { dataItem: "集中度", ruleDescription: "单一供应商采购额占比 > 40%。", deductScore: 6, severity: "中" },
                { dataItem: "资质", ruleDescription: "供应商证照过期仍下单。", deductScore: 10, severity: "高" },
                { dataItem: "黑名单", ruleDescription: "黑名单供应商 open PO。", deductScore: 15, severity: "高" },
                { dataItem: "新供应商", ruleDescription: "新供应商首单 > 100 万无试单。", deductScore: 10, severity: "高" },
                { dataItem: "关联", ruleDescription: "疑似关联供应商围标。", deductScore: 12, severity: "高" },
                { dataItem: "绩效", ruleDescription: "D 级供应商仍占采购额 > 10%。", deductScore: 8, severity: "中" },
                { dataItem: "银行", ruleDescription: "收款账号近期变更未复核。", deductScore: 10, severity: "高" },
                { dataItem: "贸易", ruleDescription: "跨境供应商无贸易合规筛查。", deductScore: 8, severity: "中" },
            ]),
        },
        {
            domain: "三单匹配",
            templates: genericTemplates("三单匹配", [
                { dataItem: "数量", ruleDescription: "发票数量与收货数量差异 > 2%。", deductScore: 10, severity: "高" },
                { dataItem: "金额", ruleDescription: "发票金额与 PO 差异 > 1%。", deductScore: 10, severity: "高" },
                { dataItem: "无 PO", ruleDescription: "发票无关联 PO。", deductScore: 12, severity: "高" },
                { dataItem: "无收货", ruleDescription: "发票已过账无 GRN。", deductScore: 12, severity: "高" },
                { dataItem: "预付款", ruleDescription: "预付款未核销 > 90 天。", deductScore: 8, severity: "中" },
                { dataItem: "退货", ruleDescription: "退货未冲减应付。", deductScore: 8, severity: "中" },
                { dataItem: "税码", ruleDescription: "发票税码与 PO 不一致。", deductScore: 8, severity: "中" },
                { dataItem: "重复发票", ruleDescription: "同号发票重复入账。", deductScore: 15, severity: "高" },
            ]),
        },
    ],
    _default: [
        {
            domain: "域A",
            templates: [
                { dataItem: "核心单据", ruleDescription: "关键业务日期不得为空。", deductScore: 10, severity: "高" },
                { dataItem: "金额", ruleDescription: "金额必须 > 0 且币种有效。", deductScore: 10, severity: "高" },
                { dataItem: "审批", ruleDescription: "超阈值须存在审批记录。", deductScore: 8, severity: "中" },
                { dataItem: "关联", ruleDescription: "子记录须关联有效父单。", deductScore: 8, severity: "中" },
                { dataItem: "重复", ruleDescription: "业务键不得重复建档。", deductScore: 5, severity: "低", autoFix: true },
                { dataItem: "状态", ruleDescription: "已关闭单据不得修改。", deductScore: 8, severity: "中" },
                { dataItem: "权限", ruleDescription: "操作人须具备岗位权限。", deductScore: 8, severity: "中" },
                { dataItem: "时效", ruleDescription: "超期未处理须标记风险。", deductScore: 10, severity: "高" },
            ],
        },
    ],
};

// Per-app lightweight overrides for remaining 17 apps (use domains + _default filler)
const EXTRA_APP_IDS = [
    "ar-risk-ai", "ap-opt-ai", "mfg-var-ai", "forecast-ai", "asset-life-ai",
    "tax-compliance-ai", "otif-ai", "quality-rca-ai", "hr-compliance-ai",
    "project-health-ai", "energy-carbon-ai", "contract-ai", "channel-inv-ai",
    "budget-control-ai", "service-sla-ai", "fx-risk-ai", "esg-report-ai",
];

for (const id of EXTRA_APP_IDS) {
    if (!APP_DOMAIN_RULES[id]) {
        APP_DOMAIN_RULES[id] = [];
    }
}

export function ensureAppDomainRules(app) {
    if (APP_DOMAIN_RULES[app.appId]?.length >= 4) return;
    const domains = app.businessDomains;
    APP_DOMAIN_RULES[app.appId] = domains.map((domain, di) => ({
        domain,
        templates: Array.from({ length: 8 }, (_, ti) => ({
            dataItem: `${domain}检查项${ti + 1}`,
            ruleDescription: `针对${domain}：检查项${ti + 1}——验证主数据完整性、单据一致性、阈值合规与跨模块勾稽（${app.productName}）。`,
            deductScore: 5 + ((di + ti) % 5) * 2,
            severity: (di + ti) % 4 === 0 ? "高" : (di + ti) % 2 === 0 ? "中" : "低",
            autoFix: ti === 7 && di === 0,
        })),
    }));
}
