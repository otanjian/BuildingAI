import { type FindOptionsWhere, ILike, Raw } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Get, Param, Query, Post } from "@nestjs/common";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { type UserPlayground } from "@buildingai/db";

import { ListDocumentsDto } from "../../dto/document.dto";
import { DatasetsService } from "../../services/datasets.service";
import { DatasetsDocumentService } from "../../services/datasets-document.service";
import { DatasetsIngestionService } from "../../services/datasets-ingestion.service";

const LIST_ORDER: Record<string, Record<string, "ASC" | "DESC">> = {
    name: { fileName: "ASC" },
    size: { fileSize: "ASC" },
    uploadTime: { createdAt: "DESC" },
};

@ConsoleController("datasets-documents", "知识库文档")
export class DatasetsDocumentsConsoleController {
    constructor(
        private readonly datasetsService: DatasetsService,
        private readonly documentService: DatasetsDocumentService,
        private readonly ingestionService: DatasetsIngestionService,
    ) {}

    @Get(":datasetId/documents")
    @Permissions({ code: "list", name: "文档列表", description: "分页查询知识库文档" })
    async listDocuments(@Param("datasetId") datasetId: string, @Query() query: ListDocumentsDto) {
        const dataset = await this.datasetsService.findOneById(datasetId);
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        const keyword = query?.keyword?.trim();
        const sortBy = query?.sortBy ?? "uploadTime";
        const where: FindOptionsWhere<any> = keyword
            ? ([
                  { datasetId, fileName: ILike(`%${keyword}%`) },
                  { datasetId, summary: ILike(`%${keyword}%`) },
                  {
                      datasetId,
                      tags: Raw((alias) => `array_to_string(${alias}, ' ') ILIKE :kw`, {
                          kw: `%${keyword}%`,
                      }),
                  },
              ] as FindOptionsWhere<any>)
            : { datasetId };
        const order = LIST_ORDER[sortBy] ?? LIST_ORDER.uploadTime;
        return this.documentService.paginate(query, { where, order });
    }

    @Get(":datasetId/ingestion-jobs")
    @Permissions({ code: "list", name: "摄取任务", description: "查询知识库摄取任务" })
    async listIngestionJobs(@Param("datasetId") datasetId: string, @Playground() user: UserPlayground) {
        const tenantId = (user as UserPlayground & { tenantId?: string }).tenantId;
        return tenantId ? this.ingestionService.listForDataset(tenantId, datasetId) : [];
    }

    @Post(":datasetId/ingestion-jobs/:jobId/:operation")
    @Permissions({ code: "manage", name: "摄取任务管理", description: "暂停、恢复、取消或重放摄取任务" })
    async controlIngestionJob(
        @Param("jobId") jobId: string,
        @Param("operation") operation: "pause" | "resume" | "cancel" | "replay",
    ) {
        if (!["pause", "resume", "cancel", "replay"].includes(operation)) {
            throw HttpErrorFactory.badRequest("不支持的摄取任务操作");
        }
        return this.ingestionService.control(jobId, operation);
    }
}
