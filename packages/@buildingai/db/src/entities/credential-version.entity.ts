import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Credential } from "./credential.entity";
import { User } from "./user.entity";

@AppEntity({ name: "tenant_credential_versions", comment: "Encrypted credential versions" })
@Index("uq_credential_version_number", ["credentialId", "version"], { unique: true })
@Index("idx_credential_version_active", ["credentialId", "revokedAt", "expiresAt"])
export class CredentialVersion extends BaseEntity {
    @Column({ type: "uuid", name: "credential_id" })
    credentialId: string;

    @ManyToOne(() => Credential, { onDelete: "CASCADE" })
    @JoinColumn({ name: "credential_id" })
    credential: Relation<Credential>;

    @Column({ type: "integer" })
    version: number;

    @Column({ type: "varchar", length: 32 })
    algorithm: string;

    @Column({ type: "varchar", length: 64, name: "key_version" })
    keyVersion: string;

    @Column({ type: "text" })
    nonce: string;

    @Column({ type: "text", name: "auth_tag" })
    authTag: string;

    @Column({ type: "text" })
    ciphertext: string;

    @Column({ type: "varchar", length: 64 })
    fingerprint: string;

    @Column({ type: "timestamptz", nullable: true, name: "expires_at" })
    expiresAt: Date | null;

    @Column({ type: "timestamptz", nullable: true, name: "overlap_until" })
    overlapUntil: Date | null;

    @Column({ type: "timestamptz", nullable: true, name: "revoked_at" })
    revokedAt: Date | null;

    @Column({ type: "uuid", nullable: true, name: "created_by" })
    createdBy: string | null;

    @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "created_by" })
    creator: Relation<User>;
}
