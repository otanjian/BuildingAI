import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "ai_agent_dependency_locks", comment: "Immutable Agent release dependencies" })
@Index("uq_ai_agent_dependency_lock", ["versionId", "dependencyType", "dependencyId"], { unique: true })
export class AiAgentDependencyLock extends BaseEntity {
    @Column({ type: "uuid", name: "version_id" }) versionId: string;
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "varchar", length: 48, name: "dependency_type" }) dependencyType: string;
    @Column({ type: "varchar", length: 160, name: "dependency_id" }) dependencyId: string;
    @Column({ type: "varchar", length: 120, name: "dependency_version", nullable: true }) dependencyVersion: string | null;
    @Column({ type: "varchar", length: 64, name: "dependency_hash", nullable: true }) dependencyHash: string | null;
    @Column({ type: "jsonb", name: "metadata", default: "{}" }) metadata: Record<string, unknown>;
}
