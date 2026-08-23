import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    CreatePersonalTodoDto,
    QueryPersonalTodoDto,
    SearchTodoAssigneesDto,
    TodoVersionDto,
    UpdatePersonalTodoDto,
    UpdateTodoProgressDto,
} from "../../dto";
import { PersonalTodoService } from "../../services/personal-todo.service";

@WebController("todos")
export class PersonalTodoWebController {
    constructor(private readonly todoService: PersonalTodoService) {}

    @Get("assignees")
    assignees(
        @Query() query: SearchTodoAssigneesDto,
        @Playground() user: UserPlayground,
    ) {
        return this.todoService.searchAssignees(user.id, query.keyword, query.limit);
    }

    @Get("count")
    count(@Playground() user: UserPlayground) {
        return this.todoService.countAssignedInProgress(user.id);
    }

    @Get()
    list(@Query() query: QueryPersonalTodoDto, @Playground() user: UserPlayground) {
        return this.todoService.list(user.id, query);
    }

    @Post()
    create(@Body() dto: CreatePersonalTodoDto, @Playground() user: UserPlayground) {
        return this.todoService.create(user.id, dto);
    }

    @Get(":id")
    detail(
        @Param("id", UUIDValidationPipe) id: string,
        @Playground() user: UserPlayground,
    ) {
        return this.todoService.get(user.id, id);
    }

    @Patch(":id")
    update(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdatePersonalTodoDto,
        @Playground() user: UserPlayground,
    ) {
        return this.todoService.update(user.id, id, dto);
    }

    @Patch(":id/progress")
    progress(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: UpdateTodoProgressDto,
        @Playground() user: UserPlayground,
    ) {
        return this.todoService.updateProgress(user.id, id, dto.progress, dto.expectedUpdatedAt);
    }

    @Post(":id/complete")
    complete(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: TodoVersionDto,
        @Playground() user: UserPlayground,
    ) {
        return this.todoService.complete(user.id, id, dto.expectedUpdatedAt);
    }

    @Post(":id/reopen")
    reopen(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: TodoVersionDto,
        @Playground() user: UserPlayground,
    ) {
        return this.todoService.reopen(user.id, id, dto.expectedUpdatedAt);
    }

    @Delete(":id")
    remove(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() dto: TodoVersionDto,
        @Playground() user: UserPlayground,
    ) {
        return this.todoService.remove(user.id, id, dto.expectedUpdatedAt);
    }
}
