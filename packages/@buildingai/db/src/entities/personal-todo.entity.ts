import { AppEntity } from "../decorators/app-entity.decorator";
import { Check, Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { SoftDeleteBaseEntity } from "./base";
import { User } from "./user.entity";

export const PERSONAL_TODO_STATUSES = ["in_progress", "completed"] as const;
export type PersonalTodoStatus = (typeof PERSONAL_TODO_STATUSES)[number];

@AppEntity({ name: "personal_todo", comment: "Personal todo" })
@Index(
    "idx_personal_todo_creator_active",
    ["creatorId", "status", "plannedCompletionDate"],
    { where: `"deleted_at" IS NULL` },
)
@Index(
    "idx_personal_todo_assignee_active",
    ["assigneeId", "status", "plannedCompletionDate"],
    { where: `"deleted_at" IS NULL` },
)
@Check("ck_personal_todo_title", `LENGTH(TRIM("title")) BETWEEN 1 AND 200`)
@Check("ck_personal_todo_progress", `"progress" BETWEEN 0 AND 100`)
@Check("ck_personal_todo_status", `"status" IN ('in_progress', 'completed')`)
@Check(
    "ck_personal_todo_lifecycle",
    `(
        "status" = 'in_progress'
        AND "progress" < 100
        AND "completed_at" IS NULL
    ) OR (
        "status" = 'completed'
        AND "progress" = 100
        AND "completed_at" IS NOT NULL
    )`,
)
export class PersonalTodo extends SoftDeleteBaseEntity {
    @Column({ type: "uuid", nullable: true, name: "tenant_id", comment: "Owning tenant" })
    tenantId: string | null;

    @Column({ type: "text", nullable: false, comment: "Todo title" })
    title: string;

    @Column({ type: "text", nullable: true, comment: "Todo description" })
    description: string | null;

    @Column({ type: "uuid", nullable: false, comment: "Creator user ID" })
    creatorId: string;

    @Column({ type: "uuid", nullable: false, comment: "Assignee user ID" })
    assigneeId: string;

    @Column({ type: "date", nullable: true, comment: "Planned completion date" })
    plannedCompletionDate: string | null;

    @Column({ type: "integer", nullable: false, default: 0, comment: "Progress percentage" })
    progress: number;

    @Column({
        type: "text",
        nullable: false,
        default: "in_progress",
        comment: "Todo lifecycle status",
    })
    status: PersonalTodoStatus;

    @Column({ type: "timestamptz", nullable: true, comment: "Actual completion time" })
    completedAt: Date | null;

    @ManyToOne(() => User, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "creator_id" })
    creator: Relation<User>;

    @ManyToOne(() => User, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "assignee_id" })
    assignee: Relation<User>;
}
