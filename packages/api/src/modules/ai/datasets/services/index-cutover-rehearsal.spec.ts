import { rehearseIndexCutover } from "./index-cutover-rehearsal";

describe("index cutover rehearsal", () => {
    it("promotes only after shadow and health gates pass", () => {
        expect(rehearseIndexCutover("shadow", "active", { shadowMatch: true, health: true }))
            .toMatchObject({ to: "active", rollbackSafe: true });
        expect(rehearseIndexCutover("shadow", "active", { shadowMatch: false, health: true }))
            .toMatchObject({ to: "rolled_back", reason: "gate_failed" });
    });

    it("keeps rollback idempotent and non-destructive", () => {
        expect(rehearseIndexCutover("rolled_back", "active", { shadowMatch: true, health: true }))
            .toMatchObject({ to: "rolled_back", reason: "already_rolled_back" });
    });
});
