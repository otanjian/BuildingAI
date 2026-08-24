import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import {
    DEFAULT_USER_AVATAR_COUNT,
    getDefaultUserAvatar,
    resolveUserAvatar,
} from "./default-user-avatar";

const avatarDirectory = resolve(__dirname, "../../../../../storage/static/avatars");

describe("default user avatars", () => {
    it("exposes the complete numbered portrait library", () => {
        expect(DEFAULT_USER_AVATAR_COUNT).toBe(34);

        for (let index = 1; index <= DEFAULT_USER_AVATAR_COUNT; index += 1) {
            const avatarPath = resolve(avatarDirectory, `${index}.png`);
            expect(existsSync(avatarPath)).toBe(true);
            expect(statSync(avatarPath).size).toBeGreaterThan(4 * 1024);
            expect(statSync(avatarPath).size).toBeLessThan(32 * 1024);

            const header = readFileSync(avatarPath).subarray(0, 24);
            expect(
                header
                    .subarray(0, 8)
                    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
            ).toBe(true);
            expect(header.readUInt32BE(8)).toBe(13);
            expect(header.readUInt32BE(16)).toBe(128);
            expect(header.readUInt32BE(20)).toBe(128);
        }
    });

    it("selects only URLs backed by the numbered library", () => {
        expect(getDefaultUserAvatar(() => 0)).toBe("/static/avatars/1.png");
        expect(getDefaultUserAvatar(() => 0.999999)).toBe("/static/avatars/34.png");
    });

    it("preserves non-blank custom avatars and defaults blank values", () => {
        expect(resolveUserAvatar("https://cdn.example.com/user.png", () => 0)).toBe(
            "https://cdn.example.com/user.png",
        );
        expect(resolveUserAvatar("   ", () => 0)).toBe("/static/avatars/1.png");
        expect(resolveUserAvatar(undefined, () => 0)).toBe("/static/avatars/1.png");
    });

    it("routes every account creation entry point through the shared selector", () => {
        const apiSource = resolve(__dirname, "../..");
        const userService = readFileSync(
            resolve(apiSource, "modules/user/services/user.service.ts"),
            "utf8",
        );
        const authService = readFileSync(
            resolve(apiSource, "common/modules/auth/services/auth.service.ts"),
            "utf8",
        );
        const systemService = readFileSync(
            resolve(apiSource, "modules/system/services/system.service.ts"),
            "utf8",
        );

        expect(userService).toContain("resolveUserAvatar(createUserDto.avatar)");
        expect(authService.match(/getDefaultUserAvatar\(\)/g)).toHaveLength(2);
        expect(systemService).toContain("resolveUserAvatar(dto.avatar)");
        expect(`${userService}${authService}${systemService}`).not.toMatch(
            /static\/avatars\/\$\{Math\.floor\(Math\.random/,
        );
    });
});
