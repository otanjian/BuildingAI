import {
    getSensitiveWordRevision,
    projectSensitiveWordRichText,
    replaceSensitiveWordText,
    resolveSensitiveWordCompatibilityUpdate,
    resolveStoredSensitiveWordPolicy,
    serializeSensitiveWordConfig,
    validateSensitiveWordRules,
    buildSensitiveWordRequest,
    hydrateSensitiveWordDraft,
} from "./sensitive-word-config.js";

describe("sensitive word configuration", () => {
    describe("strict rule validation", () => {
        it("normalizes words while preserving replacement bytes", () => {
            expect(
                validateSensitiveWordRules([
                    { word: "  Secret  ", replacement: "  public  " },
                    { word: "remove", replacement: "" },
                ]),
            ).toEqual({
                valid: true,
                rules: [
                    { word: "Secret", replacement: "  public  " },
                    { word: "remove", replacement: "" },
                ],
                errors: [],
            });
        });

        it("rejects blanks and ASCII-case-insensitive duplicates", () => {
            const result = validateSensitiveWordRules([
                { word: " ", replacement: "x" },
                { word: "apikey", replacement: "mask" },
                { word: "APIKEY", replacement: "other" },
            ]);

            expect(result.valid).toBe(false);
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: "word_blank", index: 0 }),
                    expect.objectContaining({ code: "word_duplicate", index: 2 }),
                ]),
            );
        });

        it("measures limits in Unicode code points", () => {
            expect(
                validateSensitiveWordRules([{ word: "😀".repeat(128), replacement: "🎉".repeat(128) }])
                    .valid,
            ).toBe(true);

            const result = validateSensitiveWordRules([
                { word: "😀".repeat(129), replacement: "x" },
                { word: "ok", replacement: "🎉".repeat(129) },
            ]);
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: "word_too_long", index: 0 }),
                    expect.objectContaining({ code: "replacement_too_long", index: 1 }),
                ]),
            );
        });

        it("rejects malformed entries and more than 500 rules", () => {
            const tooMany = Array.from({ length: 501 }, (_, index) => ({
                word: `word-${index}`,
                replacement: "x",
            }));
            expect(validateSensitiveWordRules(tooMany).errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ code: "rules_too_many" })]),
            );
            expect(validateSensitiveWordRules([{ word: 1, replacement: null }]).errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: "word_invalid", index: 0 }),
                    expect.objectContaining({ code: "replacement_invalid", index: 0 }),
                ]),
            );
        });
    });

    describe("stored policy normalization", () => {
        it("keeps legacy storage at revision zero and preserves empty legacy mask semantics", () => {
            const resolved = resolveStoredSensitiveWordPolicy({
                enabled: true,
                words: [" secret "],
                replacement: "",
                applyToReasoning: false,
            });

            expect(getSensitiveWordRevision({ enabled: true, words: ["secret"] })).toBe(0);
            expect(resolved).toMatchObject({
                safe: true,
                active: true,
                source: "legacy",
                revision: 0,
                applyToReasoning: false,
                rules: [{ word: "secret", replacement: "***" }],
            });
        });

        it("cleans malformed stored legacy entries without keeping a partial invalid entry", () => {
            const words = [
                " ",
                "first",
                "FIRST",
                "😀".repeat(129),
                ...Array.from({ length: 510 }, (_, index) => `valid-${index}`),
            ];
            const resolved = resolveStoredSensitiveWordPolicy({
                enabled: true,
                words,
                replacement: "mask",
            });

            expect(resolved.safe).toBe(true);
            expect(resolved.rules).toHaveLength(500);
            expect(resolved.rules[0]).toEqual({ word: "first", replacement: "mask" });
            expect(resolved.reasonCodes).toEqual(
                expect.arrayContaining([
                    "legacy_word_blank",
                    "legacy_word_duplicate",
                    "legacy_word_too_long",
                    "legacy_rule_limit",
                ]),
            );
            expect(resolved.reasonCodes.join(" ")).not.toContain("first");
        });

        it("uses a complete valid canonical rule set as authoritative", () => {
            const resolved = resolveStoredSensitiveWordPolicy({
                enabled: true,
                revision: 3,
                rules: [
                    { word: "secret", replacement: "public" },
                    { word: "remove", replacement: "" },
                ],
                words: ["secret", "remove"],
                replacement: "***",
            });

            expect(resolved).toMatchObject({
                safe: true,
                active: true,
                source: "canonical",
                revision: 3,
                rules: [
                    { word: "secret", replacement: "public" },
                    { word: "remove", replacement: "" },
                ],
            });
        });

        it("falls back atomically to a valid server mask shadow", () => {
            const resolved = resolveStoredSensitiveWordPolicy({
                enabled: true,
                revision: 2,
                rules: [
                    { word: "secret", replacement: "public" },
                    { word: "SECRET", replacement: "leak" },
                ],
                words: ["secret"],
                replacement: "***",
            });

            expect(resolved).toMatchObject({
                safe: true,
                active: true,
                source: "shadow",
                rules: [{ word: "secret", replacement: "***" }],
            });
            expect(resolved.reasonCodes).toContain("canonical_rules_invalid");
        });

        it("fails closed when enabled canonical storage has no safe representation", () => {
            const resolved = resolveStoredSensitiveWordPolicy({
                enabled: true,
                revision: 2,
                rules: [{ word: " ", replacement: "x" }],
                words: ["secret"],
                replacement: "unsafe-shared-value",
            });

            expect(resolved).toMatchObject({
                safe: false,
                active: false,
                source: "invalid",
                rules: [],
            });
            expect(resolved.reasonCodes).toEqual(
                expect.arrayContaining(["canonical_rules_invalid", "shadow_invalid"]),
            );
        });

        it("does not reinterpret a malformed revisioned canonical record as legacy storage", () => {
            const resolved = resolveStoredSensitiveWordPolicy({
                enabled: true,
                revision: 4,
                rules: { word: "secret", replacement: "public" },
                words: ["secret"],
                replacement: "unsafe-shared-value",
            });

            expect(getSensitiveWordRevision({ revision: 4, rules: null })).toBe(4);
            expect(resolved).toMatchObject({
                safe: false,
                active: false,
                source: "invalid",
                revision: 4,
                rules: [],
            });
        });

        it("treats explicitly disabled or valid-empty configuration as passthrough", () => {
            expect(
                resolveStoredSensitiveWordPolicy({
                    enabled: false,
                    revision: 2,
                    rules: [{ word: " ", replacement: "x" }],
                }),
            ).toMatchObject({ safe: true, active: false });
            expect(
                resolveStoredSensitiveWordPolicy({ enabled: true, revision: 1, rules: [] }),
            ).toMatchObject({ safe: true, active: false, source: "canonical" });
        });
    });

    describe("display projection", () => {
        const rules = [
            { word: "secret", replacement: "public" },
            { word: "secret-key", replacement: "token" },
            { word: "remove", replacement: "" },
            { word: "public", replacement: "should-not-cascade" },
        ];

        it("uses longest literal matches and does not cascade replacement output", () => {
            expect(replaceSensitiveWordText("SECRET-key secret remove", rules)).toBe(
                "token public ",
            );
        });

        it("projects only rich-text leaves and fails closed for unsafe enabled storage", () => {
            const config = {
                enabled: true,
                revision: 1,
                rules,
                words: rules.map((rule) => rule.word),
                replacement: "***",
            };
            expect(
                JSON.parse(
                    projectSensitiveWordRichText(
                        JSON.stringify({ type: "p", secret: "metadata", children: [{ text: "secret" }] }),
                        config,
                    ),
                ),
            ).toEqual({ type: "p", secret: "metadata", children: [{ text: "public" }] });
            expect(
                projectSensitiveWordRichText("secret", {
                    enabled: true,
                    revision: 2,
                    rules: null,
                    words: ["secret"],
                    replacement: "unsafe",
                }),
            ).toBe("");
        });
    });

    describe("canonical serialization", () => {
        it("initializes revision one and derives the legacy mask shadow", () => {
            expect(
                serializeSensitiveWordConfig(
                    {
                        enabled: true,
                        applyToReasoning: false,
                        rules: [
                            { word: " secret ", replacement: "public" },
                            { word: "apikey", replacement: "" },
                        ],
                    },
                    1,
                ),
            ).toEqual({
                enabled: true,
                applyToReasoning: false,
                revision: 1,
                rules: [
                    { word: "secret", replacement: "public" },
                    { word: "apikey", replacement: "" },
                ],
                words: ["secret", "apikey"],
                replacement: "***",
            });
        });
    });

    describe("editable drafts", () => {
        it("hydrates legacy settings into independent rule rows without mutating storage", () => {
            const stored = { enabled: true, words: [" one ", "two"], replacement: "mask" };
            const draft = hydrateSensitiveWordDraft(stored);
            draft.rules[0].word = "changed";

            expect(draft).toMatchObject({
                enabled: true,
                revision: 0,
                rules: [
                    { word: "changed", replacement: "mask" },
                    { word: "two", replacement: "mask" },
                ],
            });
            expect(stored.words[0]).toBe(" one ");
        });

        it("builds a canonical request without compatibility shadow fields", () => {
            expect(
                buildSensitiveWordRequest({
                    enabled: true,
                    applyToReasoning: false,
                    revision: 3,
                    rules: [{ word: " secret ", replacement: "" }],
                }),
            ).toEqual({
                errors: [],
                request: {
                    enabled: true,
                    applyToReasoning: false,
                    expectedRevision: 3,
                    rules: [{ word: "secret", replacement: "" }],
                },
            });
        });

        it("keeps invalid controlled rows visible and returns structured errors", () => {
            const result = buildSensitiveWordRequest({
                enabled: true,
                applyToReasoning: true,
                revision: 1,
                rules: [
                    { word: "apikey", replacement: "mask" },
                    { word: "APIKEY", replacement: "other" },
                ],
            });
            expect(result.request).toBeUndefined();
            expect(result.errors).toEqual(
                expect.arrayContaining([expect.objectContaining({ code: "word_duplicate", index: 1 })]),
            );
        });
    });

    describe("old-client compatibility", () => {
        const stored = serializeSensitiveWordConfig(
            {
                enabled: true,
                applyToReasoning: false,
                rules: [
                    { word: "secret", replacement: "public" },
                    { word: "apikey", replacement: "" },
                ],
            },
            4,
        );

        it("disables canonical rules without deleting them", () => {
            expect(resolveSensitiveWordCompatibilityUpdate(stored, null)).toMatchObject({
                action: "write",
                config: { enabled: false, revision: 5, rules: stored.rules },
            });
        });

        it("immediately re-enables preserved rules from an old empty/default draft", () => {
            const disabled = { ...stored, enabled: false };
            expect(
                resolveSensitiveWordCompatibilityUpdate(disabled, {
                    enabled: true,
                    words: [],
                    replacement: "***",
                    applyToReasoning: true,
                }),
            ).toMatchObject({
                action: "write",
                config: {
                    enabled: true,
                    applyToReasoning: false,
                    revision: 5,
                    rules: stored.rules,
                },
            });
        });

        it("accepts unchanged shadow switch toggles", () => {
            expect(
                resolveSensitiveWordCompatibilityUpdate(stored, {
                    enabled: true,
                    applyToReasoning: true,
                    words: ["secret", "apikey"],
                    replacement: "***",
                }),
            ).toMatchObject({
                action: "write",
                config: { applyToReasoning: true, revision: 5, rules: stored.rules },
            });
        });

        it("rejects old-client mapping edits after canonical upgrade", () => {
            expect(
                resolveSensitiveWordCompatibilityUpdate(stored, {
                    enabled: true,
                    words: ["changed"],
                    replacement: "***",
                }),
            ).toEqual({ action: "conflict", reasonCode: "mapping_edit_requires_upgrade" });
        });

        it("accepts an exact canonical echo switch toggle", () => {
            expect(
                resolveSensitiveWordCompatibilityUpdate(stored, {
                    ...stored,
                    enabled: false,
                }),
            ).toMatchObject({
                action: "write",
                config: { enabled: false, revision: 5, rules: stored.rules },
            });
        });

        it("ignores stale canonical echoes so unrelated saves can continue", () => {
            expect(
                resolveSensitiveWordCompatibilityUpdate(stored, {
                    ...stored,
                    revision: 3,
                    enabled: false,
                }),
            ).toEqual({ action: "ignore", reasonCode: "stale_canonical_echo" });
        });

        it("rejects same-revision canonical mapping mutation", () => {
            expect(
                resolveSensitiveWordCompatibilityUpdate(stored, {
                    ...stored,
                    rules: [{ word: "secret", replacement: "leak" }],
                }),
            ).toEqual({ action: "conflict", reasonCode: "canonical_echo_mutated" });
        });

        it("does not let a legacy client overwrite malformed revisioned canonical storage", () => {
            const result = resolveSensitiveWordCompatibilityUpdate(
                {
                    enabled: true,
                    revision: 4,
                    rules: null,
                    words: ["secret"],
                    replacement: "***",
                },
                {
                    enabled: true,
                    words: ["attacker-controlled"],
                    replacement: "visible",
                },
            );

            expect(result).toEqual({
                action: "conflict",
                reasonCode: "corrupt_canonical_storage",
            });
        });

        it("keeps strict old-client mapping edits legacy before canonical upgrade", () => {
            expect(
                resolveSensitiveWordCompatibilityUpdate(
                    { enabled: true, words: ["old"], replacement: "mask" },
                    { enabled: true, words: [" new "], replacement: "next" },
                ),
            ).toEqual({
                action: "write",
                config: {
                    enabled: true,
                    words: ["new"],
                    replacement: "next",
                    applyToReasoning: true,
                },
            });
        });
    });
});
