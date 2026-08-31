import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, OneToMany, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Datasets } from "./datasets.entity";
import { DatasetsSegments } from "./datasets-segments.entity";

/**
 * 文档实体
 */
@AppEntity({ name: "datasets_documents", comment: "知识库文档" })
@Index("idx_dataset_documents_scope", ["tenantId", "projectId", "datasetId", "status"])
@Index("uq_dataset_documents_checksum", ["datasetId", "checksum"], { unique: true })
export class DatasetsDocument extends BaseEntity {
    /**
     * 知识库ID
     */
    @Column({ type: "uuid", comment: "知识库ID" })
    datasetId: string;

    @Column({ type: "uuid", nullable: true, name: "tenant_id", comment: "所属租户" })
    tenantId: string | null;

    @Column({ type: "uuid", nullable: true, name: "project_id", comment: "所属项目" })
    projectId: string | null;

    @Column({ type: "varchar", length: 64, nullable: true, default: "internal", comment: "数据分类" })
    classification: string | null;

    @Column({ type: "jsonb", nullable: true, name: "acl_policy", comment: "文档 ACL 策略" })
    aclPolicy: { allowUserIds?: string[]; denyUserIds?: string[] } | null;

    @Column({ type: "integer", default: 1, name: "source_version", comment: "来源版本" })
    sourceVersion: number;

    @Column({ type: "varchar", length: 64, nullable: true, name: "parser_version", comment: "解析器版本" })
    parserVersion: string | null;

    @Column({ type: "varchar", length: 64, nullable: true, name: "chunking_version", comment: "切分版本" })
    chunkingVersion: string | null;

    @Column({ type: "varchar", length: 128, nullable: true, comment: "来源校验和" })
    checksum: string | null;

    @Column({ type: "timestamptz", nullable: true, name: "revoked_at", comment: "撤销时间" })
    revokedAt: Date | null;

    @Column({ type: "varchar", length: 64, nullable: true, name: "deletion_job_id", comment: "删除任务 ID" })
    deletionJobId: string | null;

    /**
     * 上传文件ID（可为空，如手动创建的文档）
     */
    @Column({ type: "uuid", nullable: true, comment: "上传文件ID" })
    fileId: string | null;

    /**
     * 文件存储路径（仅路径，不含域名；用于 OSS 等无 fileId 的场景）
     */
    @Column({ type: "varchar", length: 1024, nullable: true, comment: "文件存储路径" })
    fileUrl: string | null;

    /**
     * 文件名
     */
    @Column({ length: 255, comment: "文件名" })
    fileName: string;

    /**
     * 文件类型
     */
    @Column({ length: 100, comment: "文件类型" })
    fileType: string;

    /**
     * 文件大小（字节）
     */
    @Column({ type: "bigint", comment: "文件大小" })
    fileSize: number;

    /**
     * 摘要
     */
    @Column({ type: "text", nullable: true, comment: "摘要" })
    summary: string | null;

    /**
     * 摘要是否正在生成中（仅当配置了摘要模型时为 true）
     */
    @Column({ type: "boolean", default: false, comment: "摘要是否正在生成中" })
    summaryGenerating: boolean;

    /**
     * 标签
     */
    @Column({ type: "text", array: true, nullable: true, comment: "标签" })
    tags: string[] | null;

    /**
     * 分段数量
     */
    @Column({ type: "int", default: 0, comment: "分段数量" })
    chunkCount: number;

    /**
     * 字符数量（所有分段的字符总数）
     */
    @Column({ type: "bigint", default: 0, comment: "字符数量" })
    characterCount: number;

    /**
     * 文档状态
     */
    @Column({
        type: "varchar",
        length: 20,
        default: "pending",
        comment: "文档状态",
    })
    status: string;

    /**
     * 文档进度
     */
    @Column({ type: "int", default: 0, comment: "文档进度(0-100)" })
    progress: number;

    /**
     * 向量化错误信息
     */
    @Column({ type: "text", nullable: true, comment: "向量化错误信息" })
    error: string | null;

    /**
     * Embedding 模型ID
     */
    @Column({ type: "uuid", nullable: true, comment: "Embedding模型ID" })
    embeddingModelId?: string;

    /**
     * 是否启用
     */
    @Column({ type: "boolean", default: true, comment: "是否启用" })
    enabled: boolean;

    /**
     * 创建者ID
     */
    @Column({ type: "uuid", comment: "创建者ID", name: "created_by" })
    createdBy: string;

    /**
     * 关联的知识库
     */
    @ManyToOne(() => Datasets, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "dataset_id" })
    dataset?: Relation<Datasets>;

    /**
     * 文档下的分段列表
     */
    @OneToMany(() => DatasetsSegments, (segment) => segment.document)
    segments?: Relation<DatasetsSegments[]>;
}
