/**
 * 发布到广场的审核状态
 */
export enum SquarePublishStatus {
    /** 未申请或已撤销 */
    NONE = "none",
    /** 待审核 */
    PENDING = "pending",
    /** 审核通过（已上架） */
    APPROVED = "approved",
    /** 已拒绝 */
    REJECTED = "rejected",
}
