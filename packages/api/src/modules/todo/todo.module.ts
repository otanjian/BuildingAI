import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Department, DepartmentUserIndex, PersonalTodo, User } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { PersonalTodoWebController } from "./controllers/web/personal-todo.controller";
import { PersonalTodoBowiProvider } from "./mcp/personal-todo-bowi.provider";
import { PersonalTodoService } from "./services/personal-todo.service";

@Module({
    imports: [TypeOrmModule.forFeature([PersonalTodo, User, DepartmentUserIndex, Department])],
    controllers: [PersonalTodoWebController],
    providers: [PersonalTodoService, PersonalTodoBowiProvider],
    exports: [PersonalTodoService, PersonalTodoBowiProvider],
})
export class TodoModule {}
