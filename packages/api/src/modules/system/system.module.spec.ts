import fs from "node:fs";
import path from "node:path";

describe("SystemModule", () => {
    it("registers every repository required by UserService", () => {
        const source = fs.readFileSync(path.join(__dirname, "system.module.ts"), "utf8");

        expect(source).toContain("TenantMembership");
        expect(source).toMatch(/TypeOrmModule\.forFeature\(\[[\s\S]*TenantMembership[\s\S]*\]\)/);
    });
});
