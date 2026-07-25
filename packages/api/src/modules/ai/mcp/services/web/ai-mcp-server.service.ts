import { createMcpClient, type McpClient } from "@buildingai/ai-sdk";
import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiMcpServer, McpCommunicationType, McpServerType } from "@buildingai/db/entities";
import { AiUserMcpServer } from "@buildingai/db/entities";
import { Not, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import {
    CreateWebAiMcpServerDto,
    ImportWebAiMcpServerDto,
    UpdateWebAiMcpServerDto,
} from "@modules/ai/mcp/dto/web/ai-mcp-server.dto";
import { AiMcpToolService } from "@modules/ai/mcp/services/ai-mcp-tool.service";
import { Injectable, Logger } from "@nestjs/common";

import { withTimeout } from "@common/utils/with-timeout";

/** Max wait for MCP handshake + listTools during connection checks. */
const MCP_CHECK_CONNECTION_TIMEOUT_MS = 15_000;

/**
 * 前台MCP服务配置服务
 *
 * 提供用户管理自己的MCP服务的功能
 */
@Injectable()
export class WebAiMcpServerWebService extends BaseService<AiMcpServer> {
    private readonly mcpLogger = new Logger(WebAiMcpServerWebService.name);

    constructor(
        @InjectRepository(AiMcpServer)
        private readonly aiMcpServerRepository: Repository<AiMcpServer>,
        @InjectRepository(AiUserMcpServer)
        private readonly aiUserMcpServerRepository: Repository<AiUserMcpServer>,
        private readonly aiMcpToolService: AiMcpToolService,
    ) {
        super(aiMcpServerRepository);
    }

    /**
     * 创建用户的MCP服务
     *
     * @param createDto 创建DTO
     * @param creatorId 创建者ID
     * @returns 创建的MCP服务
     */
    async createMcpServer(createDto: CreateWebAiMcpServerDto, creatorId: string) {
        // 检查同名服务是否已存在
        const existServer = await this.findOne({
            where: {
                name: createDto.name,
                creatorId,
            },
        });

        if (existServer) {
            throw HttpErrorFactory.badRequest(`名为 ${createDto.name} 的MCP服务已存在`);
        }

        const dto = {
            ...createDto,
            creatorId,
            type: McpServerType.USER,
        };

        // 创建MCP服务
        return await this.create(dto);
    }

    /**
     * 更新用户的MCP服务
     *
     * @param id 关联记录ID
     * @param updateDto 更新DTO
     * @param userId 用户ID
     * @returns 更新后的MCP服务
     */
    async updateMcpServer(id: string, updateDto: UpdateWebAiMcpServerDto, userId: string) {
        // 查询用户与MCP服务的关联记录
        const mcpServer = await this.findOne({
            where: {
                id,
                creatorId: userId,
            },
            relations: ["userMcpServer"],
        });

        if (!mcpServer) {
            throw HttpErrorFactory.notFound("MCP服务不存在");
        }

        // 如果更新了名称，检查同名服务是否已存在
        if (updateDto.name) {
            const existServer = await this.findOne({
                where: {
                    name: updateDto.name,
                    creatorId: userId,
                    id: Not(mcpServer.id), // 排除自己
                },
            });

            if (existServer) {
                throw HttpErrorFactory.badRequest(`名为 ${updateDto.name} 的MCP服务已存在`);
            }
        }

        // 更新MCP服务
        return await this.updateById(mcpServer.id, updateDto);
    }

    /**
     * 切换用户MCP服务的显示状态
     *
     * @param id MCP服务ID
     * @param status 显示状态值
     * @param userId 用户ID
     * @returns 更新后的MCP服务
     */
    async toggleMcpServerStatus(id: string, status: boolean, userId: string) {
        const mcpServer = await this.findOneById(id);
        if (!mcpServer) {
            throw HttpErrorFactory.notFound("MCP服务不存在");
        }

        if (mcpServer.type === McpServerType.SYSTEM) {
            const userMcpServer = await this.aiUserMcpServerRepository.findOne({
                where: {
                    userId,
                    mcpServerId: id,
                },
            });

            if (userMcpServer) {
                await this.aiUserMcpServerRepository.update(userMcpServer.id, {
                    isDisabled: status,
                });
            } else {
                await this.aiUserMcpServerRepository.save({
                    userId,
                    mcpServerId: id,
                    isDisabled: status,
                });
            }
        } else {
            await this.updateById(id, {
                isDisabled: status,
            });
        }

        return await this.findOneById(id);
    }

    /**
     * Import MCP server configurations from JSON
     *
     * @param importDto Import MCP server DTO
     * @returns Import result
     */
    async importMcpServers(importDto: ImportWebAiMcpServerDto) {
        const { mcpServers, creatorId } = importDto;
        const results = [];
        const errors = [];
        let createdCount = 0;

        // Iterate through all MCP server configurations
        for (const [name, config] of Object.entries(mcpServers)) {
            try {
                // Use the full URL directly
                const url = config.url;

                // Communication type
                const communicationType = config.type;

                // Check if a server with the same name already exists
                const existServer = await this.findOne({
                    where: { name },
                });

                if (existServer) {
                    // If exists, skip and count as failed
                    errors.push({
                        name,
                        error: `MCP server with name "${name}" already exists`,
                    });
                } else {
                    // If not exists, create new server
                    const mcpServer = await this.create({
                        name,
                        communicationType,
                        type: McpServerType.USER,
                        url,
                        creatorId,
                        headers: config.headers || {},
                        description: `MCP server imported from JSON: ${name}`,
                        icon: "",
                        sortOrder: 0,
                        isDisabled: false,
                    });
                    results.push({
                        ...mcpServer,
                        status: "created",
                    });
                    createdCount++;
                }
            } catch (error) {
                errors.push({
                    name,
                    error: error.message,
                });
            }
        }

        return {
            success: errors.length === 0,
            total: Object.keys(mcpServers).length,
            created: createdCount,
            results,
            errors,
        };
    }

    /**
     * 检测MCP服务连接状态并更新工具列表
     *
     * @param id MCP服务ID
     * @param userId 用户ID（用于权限验证）
     * @returns 连接检测结果
     */
    async checkConnectionAndUpdateTools(
        id: string,
        userId: string,
    ): Promise<{
        success: boolean;
        connectable: boolean;
        message: string;
        toolsInfo?: {
            created: number;
            updated: number;
            deleted: number;
            total: number;
        };
        error?: string;
    }> {
        // 检查服务是否存在
        const mcpServer = await this.findOneById(id);
        if (!mcpServer) {
            throw HttpErrorFactory.notFound(`ID为 ${id} 的MCP服务不存在`);
        }

        if (mcpServer.creatorId !== userId) {
            throw HttpErrorFactory.forbidden("您没有权限操作该MCP服务");
        }

        let mcpClient: McpClient | null = null;
        let connectable = false;
        let toolsInfo = undefined;
        let errorMessage = "";

        try {
            const connected = await withTimeout(
                (async () => {
                    const client = await createMcpClient({
                        transport: {
                            type:
                                mcpServer.communicationType === McpCommunicationType.SSE
                                    ? "sse"
                                    : "http",
                            url: mcpServer.url,
                            ...(mcpServer.headers && { headers: mcpServer.headers }),
                        },
                        name: mcpServer.name,
                    });
                    const tools = await client.listTools();
                    return { client, tools };
                })(),
                MCP_CHECK_CONNECTION_TIMEOUT_MS,
                `MCP connection timed out after ${MCP_CHECK_CONNECTION_TIMEOUT_MS / 1000}s`,
            );

            mcpClient = connected.client;
            connectable = true;

            // 更新工具列表
            toolsInfo = await this.aiMcpToolService.updateToolsForMcpServer(id, connected.tools);

            this.mcpLogger.log(`MCP服务 ${mcpServer.name} 连接成功，更新了 ${toolsInfo.total} 个工具`);
        } catch (error) {
            connectable = false;
            errorMessage = error instanceof Error ? error.message : "连接失败";
            this.mcpLogger.error(
                `MCP服务 ${mcpServer.name} 连接失败: ${errorMessage}`,
                error instanceof Error ? error.stack : undefined,
            );

            // 连接失败时清空工具列表
            const deletedCount = await this.aiMcpToolService.deleteToolsForMcpServer(id);
            if (deletedCount > 0) {
                this.mcpLogger.log(`已清空 ${deletedCount} 个失效的工具`);
            }
        } finally {
            if (mcpClient) {
                try {
                    await mcpClient.close();
                } catch (disconnectError) {
                    this.mcpLogger.warn(
                        `断开MCP连接时出现警告: ${
                            disconnectError instanceof Error
                                ? disconnectError.message
                                : String(disconnectError)
                        }`,
                    );
                }
            }
        }

        // 更新连接状态和错误信息
        await this.updateById(id, {
            connectable,
            connectError: connectable ? "" : errorMessage,
        });

        return {
            success: true,
            connectable,
            message: connectable
                ? `MCP服务连接成功，${toolsInfo ? `更新了 ${toolsInfo.total} 个工具` : "无工具更新"}`
                : `MCP服务连接失败: ${errorMessage}`,
            toolsInfo,
            error: connectable ? undefined : errorMessage,
        };
    }
}
