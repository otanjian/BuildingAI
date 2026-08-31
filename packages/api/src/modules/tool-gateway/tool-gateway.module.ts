import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { ToolApproval, ToolDefinition, ToolExecution } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";
import { ToolGatewayController } from "./controllers/tool-gateway.controller";
import { ToolGatewayService } from "./services/tool-gateway.service";
import { ToolGatewayMcpBoundary } from "./services/tool-gateway-mcp-boundary.service";

@Module({ imports: [TypeOrmModule.forFeature([ToolDefinition, ToolApproval, ToolExecution])], controllers: [ToolGatewayController], providers: [ToolGatewayService, ToolGatewayMcpBoundary], exports: [ToolGatewayService, ToolGatewayMcpBoundary] })
export class ToolGatewayModule {}
