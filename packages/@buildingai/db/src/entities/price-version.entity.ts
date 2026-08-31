import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "price_versions", comment: "Versioned provider pricing" })
@Index("uq_price_version_provider_model", ["provider", "model", "version"], { unique: true })
export class PriceVersion extends BaseEntity {
    @Column({ type: "varchar", length: 120 }) provider: string;
    @Column({ type: "varchar", length: 120 }) model: string;
    @Column({ type: "varchar", length: 64 }) version: string;
    @Column({ type: "numeric", precision: 20, scale: 12, name: "input_unit_price", default: 0 }) inputUnitPrice: string;
    @Column({ type: "numeric", precision: 20, scale: 12, name: "output_unit_price", default: 0 }) outputUnitPrice: string;
    @Column({ type: "numeric", precision: 20, scale: 12, name: "tool_unit_price", default: 0 }) toolUnitPrice: string;
    @Column({ type: "timestamptz", name: "effective_from" }) effectiveFrom: Date;
    @Column({ type: "timestamptz", nullable: true, name: "effective_to" }) effectiveTo: Date | null;
    @Column({ type: "jsonb", default: "{}" }) metadata: Record<string, unknown>;
}
