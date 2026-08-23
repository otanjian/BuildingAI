import type {
    BowiMcpProvider,
    BowiMcpTool,
    BowiPrincipal,
} from "@modules/bowi-mcp/types/bowi-mcp.types";
import { Injectable } from "@nestjs/common";

import { PersonalTodoService } from "../services/personal-todo.service";

const string = (description: string) => ({ type: "string", description });
const uuid = (description: string) => ({ ...string(description), format: "uuid" });
const date = (description: string) => ({ ...string(description), format: "date" });
const timestamp = (description: string) => ({ ...string(description), format: "date-time" });
const progress = (description: string) => ({ type: "integer", minimum: 0, maximum: 100, description });

@Injectable()
export class PersonalTodoBowiProvider implements BowiMcpProvider {
    readonly bowiMcpProvider = true as const;
    readonly namespace = "todo";
    readonly tools: BowiMcpTool[];

    constructor(private readonly todoService: PersonalTodoService) {
        this.tools = [
            this.tool(
                "todo_search",
                "Search todos visible to the current verified user. Use the returned id and updatedAt for mutations.",
                {
                    relationship: { type: "string", enum: ["visible", "created_by_me", "assigned_to_me"], default: "visible" },
                    status: { type: "string", enum: ["in_progress", "completed", "all"], default: "in_progress" },
                    keyword: string("Case-insensitive title or description search"),
                    plannedDateFrom: date("Inclusive planned completion date lower bound"),
                    plannedDateTo: date("Inclusive planned completion date upper bound"),
                    progressMin: progress("Inclusive minimum progress"),
                    progressMax: progress("Inclusive maximum progress"),
                    page: { type: "integer", minimum: 1, default: 1 },
                    pageSize: { type: "integer", minimum: 1, maximum: 50, default: 15 },
                },
                [],
                (args, principal) => {
                    const relationship = args.relationship ?? "visible";
                    return this.todoService.list(principal.subjectUserId!, {
                        tab: (args.status as "in_progress" | "completed" | "all" | undefined) ?? "in_progress",
                        ...(relationship === "created_by_me" ? { creatorId: principal.subjectUserId } : {}),
                        ...(relationship === "assigned_to_me" ? { assigneeId: principal.subjectUserId } : {}),
                        keyword: args.keyword as string | undefined,
                        plannedDateFrom: args.plannedDateFrom as string | undefined,
                        plannedDateTo: args.plannedDateTo as string | undefined,
                        progressMin: args.progressMin as number | undefined,
                        progressMax: args.progressMax as number | undefined,
                        page: (args.page as number | undefined) ?? 1,
                        pageSize: (args.pageSize as number | undefined) ?? 15,
                    });
                },
                { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            ),
            this.tool(
                "todo_search_assignees",
                "Search active BuildingAI users eligible to be assigned a todo.",
                {
                    keyword: string("Name or username search"),
                    limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
                },
                [],
                (args, principal) =>
                    this.todoService.searchAssignees(
                        principal.subjectUserId!,
                        args.keyword as string | undefined,
                        (args.limit as number | undefined) ?? 20,
                    ),
                { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            ),
            this.tool(
                "todo_create",
                "Create a personal todo. The verified current user is always the creator.",
                {
                    title: { ...string("Todo title"), minLength: 1, maxLength: 200 },
                    description: { type: ["string", "null"], description: "Optional todo description" },
                    assigneeId: uuid("Eligible assignee id; omit to assign to the creator"),
                    plannedCompletionDate: { type: ["string", "null"], format: "date", description: "Planned completion date" },
                },
                ["title"],
                (args, principal) => this.todoService.create(principal.subjectUserId!, args as never),
                { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            ),
            this.tool(
                "todo_update",
                "Update creator-owned todo definition fields. Search first and pass the current updatedAt value.",
                {
                    todoId: uuid("Todo id"),
                    title: { ...string("Todo title"), minLength: 1, maxLength: 200 },
                    description: { type: ["string", "null"], description: "Todo description; null clears it" },
                    assigneeId: uuid("Eligible assignee id"),
                    plannedCompletionDate: { type: ["string", "null"], format: "date", description: "Planned completion date; null clears it" },
                    expectedUpdatedAt: timestamp("Current updatedAt returned by todo_search"),
                },
                ["todoId", "expectedUpdatedAt"],
                (args, principal) => {
                    const { todoId, ...dto } = args;
                    return this.todoService.update(principal.subjectUserId!, todoId as string, dto as never);
                },
                { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            ),
            this.tool(
                "todo_set_progress",
                "Set todo progress. Progress 100 completes the todo; reducing it reopens the todo.",
                {
                    todoId: uuid("Todo id"),
                    progress: progress("New progress percentage"),
                    expectedUpdatedAt: timestamp("Current updatedAt returned by todo_search"),
                },
                ["todoId", "progress", "expectedUpdatedAt"],
                (args, principal) =>
                    this.todoService.updateProgress(
                        principal.subjectUserId!,
                        args.todoId as string,
                        args.progress as number,
                        args.expectedUpdatedAt as string,
                    ),
                { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            ),
            this.tool(
                "todo_delete",
                "Soft-delete a creator-owned todo after explicit user confirmation.",
                {
                    todoId: uuid("Todo id"),
                    expectedUpdatedAt: timestamp("Current updatedAt returned by todo_search"),
                },
                ["todoId", "expectedUpdatedAt"],
                (args, principal) =>
                    this.todoService.remove(
                        principal.subjectUserId!,
                        args.todoId as string,
                        args.expectedUpdatedAt as string,
                    ),
                { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
            ),
        ];
    }

    private tool(
        name: string,
        description: string,
        properties: Record<string, unknown>,
        required: string[],
        execute: BowiMcpTool["execute"],
        annotations: BowiMcpTool["annotations"],
    ): BowiMcpTool {
        return {
            name,
            description,
            inputSchema: {
                type: "object",
                properties,
                ...(required.length ? { required } : {}),
                additionalProperties: false,
            },
            annotations,
            capability: "todo.personal",
            execute: (args: Record<string, unknown>, principal: BowiPrincipal) => execute(args, principal),
        };
    }
}
