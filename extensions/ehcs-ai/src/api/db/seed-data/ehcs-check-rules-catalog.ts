/** Catalog version — bump when rule set changes to re-run catalog seeder. */
export const EHCS_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type EhcsCheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
};

export const EHCS_CHECK_RULES_CATALOG: EhcsCheckRuleCatalogEntry[] = [
    // 财务数据 (11)
    {
        ruleId: "RULE_001",
        businessDomain: "财务数据",
        dataItem: "总账与子模块余额一致性",
        ruleDescription:
            "比较总账(GL)科目余额表与应收(AR)、应付(AP)、固定资产(FA)子模块汇总值，差异绝对值 ≤ 0.01元视为通过；否则生成对账差异报告。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_002",
        businessDomain: "财务数据",
        dataItem: "未审核凭证滞留检查",
        ruleDescription:
            '查询凭证表审核状态 = "未审核" 且 凭证日期 ≤ 当前日期-2天，统计数量并告警，确保月末关账前清理。',
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_003",
        businessDomain: "财务数据",
        dataItem: "会计期间未关闭/未结转",
        ruleDescription:
            "检测财务日历当前会计期间状态是否为「已关闭」，若存在未结转损益科目余额不为零且期间打开，触发异常。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_004",
        businessDomain: "财务数据",
        dataItem: "应付账款账龄超期(逾期)",
        ruleDescription:
            "提取应付发票到期日超过90天仍未付款的金额及明细，逾期占比 > 5%需重点关注，规避信用风险。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "RULE_005",
        businessDomain: "财务数据",
        dataItem: "应收账款坏账风险(长账龄)",
        ruleDescription:
            "账龄分析报表：应收账款逾期 > 180天未回款，标记为高风险，并计算坏账准备金差异。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_006",
        businessDomain: "财务数据",
        dataItem: "固定资产折旧异常检查",
        ruleDescription:
            "对比固定资产卡片当前期间是否计提折旧（当月未折旧且原值 > 0），折旧额与系统计算规则偏差超过5%告警。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "RULE_007",
        businessDomain: "财务数据",
        dataItem: "重复发票号码/校验",
        ruleDescription:
            "按供应商 + 发票号码分组，计数 > 1 且金额差异 > 0.01元，则提示潜在重复入账或舞弊风险。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_008",
        businessDomain: "财务数据",
        dataItem: "总账科目未激活/未映射",
        ruleDescription:
            "检查科目主数据(COA)：未分配报表、未激活记账状态或缺失损益表科目类型，影响财务合并。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "RULE_009",
        businessDomain: "财务数据",
        dataItem: "银行对账单未达项超期",
        ruleDescription:
            "银行存款调节表中未达账项（企业已收/银行未收）超过30天未清理，统计数量和金额阈值。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "RULE_010",
        businessDomain: "财务数据",
        dataItem: "预算执行超支监控",
        ruleDescription:
            "实际费用科目累计发生额超出预算金额5%以上，触发预算预警，需重新审批或调整。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "RULE_011",
        businessDomain: "财务数据",
        dataItem: "税金科目申报差异",
        ruleDescription:
            '对比增值税申报表数据与账务「应交税费」科目差异率 > 0.5%，提示税务风险并检查纳税调整项。',
        deductScore: 10,
        severity: "高",
    },
    // 合作伙伴 (12)
    {
        ruleId: "RULE_012",
        businessDomain: "合作伙伴",
        dataItem: "客户/供应商税务号缺失/无效",
        ruleDescription:
            "校验税务登记号字段：为空，或不符合国家规则（长度/正则），标记主数据不完整，影响合规开票。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "RULE_013",
        businessDomain: "合作伙伴",
        dataItem: "供应商银行账户校验失败",
        ruleDescription:
            "对供应商银行账号字段执行 IBAN 校验或银行代码有效性规则，若未通过则提示付款风险。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "RULE_014",
        businessDomain: "合作伙伴",
        dataItem: "重复的合作伙伴编码",
        ruleDescription:
            "基于客户/供应商编码全局唯一性扫描，分组计数 > 1 则输出重复清单；同时模糊匹配名称相似度 > 80% 辅助识别。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "RULE_015",
        businessDomain: "合作伙伴",
        dataItem: "联系人邮箱格式错误",
        ruleDescription:
            "正则表达式检测邮箱字段：必须包含 @ 和域名(.com/.cn 等)，无效邮箱导致业务通信失败。",
        deductScore: 3,
        severity: "低",
    },
    {
        ruleId: "RULE_016",
        businessDomain: "合作伙伴",
        dataItem: "信用额度超限无审批",
        ruleDescription:
            "统计客户信用使用率(已用额度/总授信) > 100% 且无特殊审批单关联，提示超额风险。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_017",
        businessDomain: "合作伙伴",
        dataItem: "供应商合同过期未续签",
        ruleDescription:
            "检查供应商框架协议/采购合同有效期：结束日期 < 当前日期且无新合同编号，下单限制预警。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "RULE_018",
        businessDomain: "合作伙伴",
        dataItem: "客户主数据地址未标准化",
        ruleDescription:
            "缺失省/市/区 或 邮政编码，或地址字段仅数字/符号，判定为地理信息不完整。",
        deductScore: 3,
        severity: "低",
    },
    {
        ruleId: "RULE_019",
        businessDomain: "合作伙伴",
        dataItem: "黑名单/制裁列表预警",
        ruleDescription:
            "关联外部/内部黑名单库，匹配客户/供应商名称或税号，命中则触发合规警报。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_020",
        businessDomain: "合作伙伴",
        dataItem: "联系人手机号无效/重复",
        ruleDescription:
            "正则校验手机号（11位数字且符合国内号段）；同一客户下多个联系人共用手机号重复告警。",
        deductScore: 3,
        severity: "低",
    },
    {
        ruleId: "RULE_021",
        businessDomain: "合作伙伴",
        dataItem: "客户销售区域分配不一致",
        ruleDescription:
            "检查客户主数据中销售组织/分销渠道与订单使用的销售区域配置是否匹配，避免定价错误。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "RULE_022",
        businessDomain: "合作伙伴",
        dataItem: "供应商税号格式校验(国标)",
        ruleDescription:
            "依据中国/海外税务规范，验证税号位数（统一社会信用代码18位）及逻辑，错误率统计。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "RULE_023",
        businessDomain: "合作伙伴",
        dataItem: "DUNS编码缺失(国际业务)",
        ruleDescription:
            "针对涉外交易伙伴，检查邓白氏编码(DUNS)是否为空，影响信用评估和进出口合规。",
        deductScore: 5,
        severity: "中",
    },
    // 供应链 (12)
    {
        ruleId: "RULE_024",
        businessDomain: "供应链",
        dataItem: "库存负数/可用量异常",
        ruleDescription:
            "扫描库存现有量表，物料库存数量 < 0 则标记违规，禁止出库并触发库存调整流程。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_025",
        businessDomain: "供应链",
        dataItem: "呆滞库存超期(无动销)",
        ruleDescription:
            "物料最后出库/入库日期距今 > 180天且库存数量 > 0，生成呆滞清单，建议处理方案。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "RULE_026",
        businessDomain: "供应链",
        dataItem: "未完成采购订单逾期",
        ruleDescription:
            "采购订单交货日期 < 当前日期，且订单状态 ≠ 已完成/已取消，系统报警并催单。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "RULE_027",
        businessDomain: "供应链",
        dataItem: "销售订单承诺超可用库存(ATP)",
        ruleDescription:
            "对未交货销售订单，检查承诺量 > 可用库存 + 在途量，超出部分触发重排产警告。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_028",
        businessDomain: "供应链",
        dataItem: "BOM循环引用/自循环",
        ruleDescription:
            "递归检查物料清单(BOM)中父项与子项是否存在闭环引用，导致 MRP 无限循环。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_029",
        businessDomain: "供应链",
        dataItem: "批次到期/临期未处理",
        ruleDescription:
            "检查库存批次表：失效日期 < 当前日期即过期；失效日期 < 30天预警，须冻结或退货。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "RULE_030",
        businessDomain: "供应链",
        dataItem: "安全库存低于阈值",
        ruleDescription:
            "当前库存量 < 安全库存设定值，需求波动可能导致缺货，生成补货建议。",
        deductScore: 8,
        severity: "中",
    },
    {
        ruleId: "RULE_031",
        businessDomain: "供应链",
        dataItem: "采购收货数量差异(超交/短交)",
        ruleDescription:
            "比较采购订单数量与实际收货数量：差异超过订单10%或短交未关闭，需分析原因。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "RULE_032",
        businessDomain: "供应链",
        dataItem: "生产工单物料短缺",
        ruleDescription:
            "对下达的生产工单，检查组件需求库存是否满足，不足量影响计划完工日期。",
        deductScore: 10,
        severity: "高",
    },
    {
        ruleId: "RULE_033",
        businessDomain: "供应链",
        dataItem: "仓库货位数据不匹配",
        ruleDescription:
            "物料主数据指定货位代码未在仓库配置表中定义，或货位已被禁用导致收发货异常。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "RULE_034",
        businessDomain: "供应链",
        dataItem: "在途库存超龄(未按时入库)",
        ruleDescription:
            "在途采购订单（已发运未收货）创建日期距今天数 > 标准运输周期 + 15天，提示物流异常。",
        deductScore: 5,
        severity: "中",
    },
    {
        ruleId: "RULE_035",
        businessDomain: "供应链",
        dataItem: "物料主数据缺失关键视图",
        ruleDescription:
            "检查物料是否同时缺少采购视图、销售视图或生产视图，导致业务流程中断。",
        deductScore: 5,
        severity: "中",
    },
];
