import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import {
    SensitiveWordCompatibilityConfigDto,
    UpdateSensitiveWordConfigDto,
} from "./sensitive-word-config.dto";

describe("sensitive word DTO validation", () => {
    it("accepts a canonical request with empty replacement", async () => {
        const dto = plainToInstance(UpdateSensitiveWordConfigDto, {
            enabled: true,
            applyToReasoning: false,
            expectedRevision: 0,
            rules: [{ word: "secret", replacement: "" }],
        });

        await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual(
            [],
        );
    });

    it("rejects canonical shadow fields and malformed nested values", async () => {
        const dto = plainToInstance(UpdateSensitiveWordConfigDto, {
            enabled: true,
            applyToReasoning: true,
            expectedRevision: 0,
            words: ["must-not-be-accepted"],
            replacement: "***",
            rules: [{ word: "secret", replacement: 1 }],
        });
        const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

        expect(errors.map((error) => error.property)).toEqual(
            expect.arrayContaining(["words", "replacement", "rules"]),
        );
    });

    it("rejects duplicate normalized words and Unicode code-point overflow", async () => {
        const dto = plainToInstance(UpdateSensitiveWordConfigDto, {
            enabled: true,
            applyToReasoning: true,
            expectedRevision: 1,
            rules: [
                { word: "apikey", replacement: "mask" },
                { word: "APIKEY", replacement: "other" },
                { word: "😀".repeat(129), replacement: "x" },
            ],
        });
        const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

        expect(errors.find((error) => error.property === "rules")).toBeDefined();
    });

    it("accepts only a strict legacy config or a complete canonical echo for general PATCH", async () => {
        const legacy = plainToInstance(SensitiveWordCompatibilityConfigDto, {
            enabled: false,
            words: ["secret"],
            replacement: "***",
            applyToReasoning: true,
        });
        const canonical = plainToInstance(SensitiveWordCompatibilityConfigDto, {
            enabled: true,
            rules: [{ word: "secret", replacement: "public" }],
            revision: 3,
            words: ["secret"],
            replacement: "***",
            applyToReasoning: false,
        });

        await expect(validate(legacy, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual(
            [],
        );
        await expect(
            validate(canonical, { whitelist: true, forbidNonWhitelisted: true }),
        ).resolves.toEqual([]);
    });

    it("rejects partial canonical mutation shapes in general PATCH", async () => {
        const dto = plainToInstance(SensitiveWordCompatibilityConfigDto, {
            enabled: true,
            rules: [{ word: "secret", replacement: "public" }],
            revision: 3,
        });
        const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

        expect(errors).not.toEqual([]);
    });
});
