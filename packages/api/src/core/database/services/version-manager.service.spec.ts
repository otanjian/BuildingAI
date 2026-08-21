jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { VersionManagerService } from "./version-manager.service";

describe("VersionManagerService migration ranges", () => {
    it("runs each upgrade from the installed/previous version instead of replaying from initial", async () => {
        const service = new VersionManagerService({} as any, {
            createContext: jest.fn(() => ({})),
            executeUpgradeScripts: jest.fn(async () => undefined),
        } as any);
        const migrations = { runMigrations: jest.fn(async () => undefined) };
        (service as any).migrationRunner = migrations;
        (service as any).writeVersionFile = jest.fn(async () => undefined);

        await (service as any).executeUpgrade({
            installed: "26.1.1",
            current: "26.1.5",
            needsUpgrade: true,
            upgradeVersions: ["26.1.2", "26.1.3", "26.1.4", "26.1.5"],
        });

        expect(migrations.runMigrations.mock.calls).toEqual([
            ["26.1.1", "26.1.2"],
            ["26.1.2", "26.1.3"],
            ["26.1.3", "26.1.4"],
            ["26.1.4", "26.1.5"],
        ]);
    });
});
