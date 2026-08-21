import type {
    SensitiveWordConfig,
    SensitiveWordConfigUpdate,
    SensitiveWordReplacementRule,
} from "@buildingai/types/ai/agent-config.interface";

export const SENSITIVE_WORD_MAX_RULES = 500;
export const SENSITIVE_WORD_MAX_CODE_POINTS = 128;
export const SENSITIVE_WORD_LEGACY_MASK = "***";

export type SensitiveWordValidationErrorCode =
    | "rules_invalid"
    | "rules_too_many"
    | "rule_invalid"
    | "word_invalid"
    | "word_blank"
    | "word_too_long"
    | "word_duplicate"
    | "replacement_invalid"
    | "replacement_too_long";

export interface SensitiveWordValidationError {
    code: SensitiveWordValidationErrorCode;
    index?: number;
}

export type SensitiveWordRulesValidation =
    | {
          valid: true;
          rules: SensitiveWordReplacementRule[];
          errors: [];
      }
    | {
          valid: false;
          rules: SensitiveWordReplacementRule[];
          errors: SensitiveWordValidationError[];
      };

export type SensitiveWordPolicySource = "absent" | "legacy" | "canonical" | "shadow" | "invalid";

export interface ResolvedSensitiveWordPolicy {
    safe: boolean;
    active: boolean;
    source: SensitiveWordPolicySource;
    revision: number;
    enabled: boolean;
    applyToReasoning: boolean;
    rules: SensitiveWordReplacementRule[];
    reasonCodes: string[];
}

export interface SensitiveWordCanonicalInput {
    enabled: boolean;
    rules: unknown;
    applyToReasoning?: boolean;
}

export interface SensitiveWordDraft {
    enabled: boolean;
    applyToReasoning: boolean;
    revision: number;
    rules: SensitiveWordReplacementRule[];
}

export type SensitiveWordCompatibilityUpdate =
    | { action: "write"; config: SensitiveWordConfig | null }
    | { action: "noop"; config: SensitiveWordConfig | null }
    | { action: "ignore"; reasonCode: "stale_canonical_echo" }
    | {
          action: "conflict";
          reasonCode:
              | "mapping_edit_requires_upgrade"
              | "canonical_echo_mutated"
              | "invalid_canonical_echo"
              | "invalid_legacy_update"
              | "corrupt_canonical_storage";
      };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sensitiveWordCodePointLength(value: string): number {
    return [...value].length;
}

export function foldSensitiveWordAscii(value: string): string {
    let result = "";
    for (const character of value) {
        const code = character.codePointAt(0)!;
        result += code >= 0x41 && code <= 0x5a ? String.fromCodePoint(code + 0x20) : character;
    }
    return result;
}

/** Applies literal, ASCII-case-insensitive, longest-first rules without cascading output. */
export function replaceSensitiveWordText(
    input: string,
    rules: SensitiveWordReplacementRule[],
): string {
    if (!input || rules.length === 0) return input;
    const source = [...input];
    const compiled = rules.map((rule) => ({
        source: [...foldSensitiveWordAscii(rule.word)],
        replacement: rule.replacement,
    }));
    const output: string[] = [];

    for (let cursor = 0; cursor < source.length; ) {
        let selected: (typeof compiled)[number] | undefined;
        for (const rule of compiled) {
            if (rule.source.length === 0 || cursor + rule.source.length > source.length) continue;
            if (selected && selected.source.length >= rule.source.length) continue;
            let matches = true;
            for (let offset = 0; offset < rule.source.length; offset += 1) {
                if (foldSensitiveWordAscii(source[cursor + offset]!) !== rule.source[offset]) {
                    matches = false;
                    break;
                }
            }
            if (matches) selected = rule;
        }
        if (selected) {
            output.push(selected.replacement);
            cursor += selected.source.length;
        } else {
            output.push(source[cursor]!);
            cursor += 1;
        }
    }
    return output.join("");
}

function projectSensitiveWordTextLeaves(
    value: unknown,
    rules: SensitiveWordReplacementRule[],
): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => projectSensitiveWordTextLeaves(item, rules));
    }
    if (!isRecord(value)) return value;
    const result: UnknownRecord = {};
    for (const [key, child] of Object.entries(value)) {
        result[key] =
            key === "text" && typeof child === "string"
                ? replaceSensitiveWordText(child, rules)
                : projectSensitiveWordTextLeaves(child, rules);
    }
    return result;
}

/** Projects plain or JSON rich text; unsafe enabled storage returns no display text. */
export function projectSensitiveWordRichText(value: string, config: unknown): string {
    const policy = resolveStoredSensitiveWordPolicy(config);
    if (!policy.safe) return "";
    if (!policy.active || !value) return value;
    try {
        const parsed = JSON.parse(value);
        if (!isRecord(parsed) && !Array.isArray(parsed)) {
            return replaceSensitiveWordText(value, policy.rules);
        }
        return JSON.stringify(projectSensitiveWordTextLeaves(parsed, policy.rules));
    } catch {
        return replaceSensitiveWordText(value, policy.rules);
    }
}

export function validateSensitiveWordRules(rules: unknown): SensitiveWordRulesValidation {
    if (!Array.isArray(rules)) {
        return { valid: false, rules: [], errors: [{ code: "rules_invalid" }] };
    }

    const errors: SensitiveWordValidationError[] = [];
    const normalized: SensitiveWordReplacementRule[] = [];
    const seen = new Set<string>();

    if (rules.length > SENSITIVE_WORD_MAX_RULES) {
        errors.push({ code: "rules_too_many" });
    }

    for (let index = 0; index < rules.length; index += 1) {
        const value = rules[index];
        if (!isRecord(value)) {
            errors.push({ code: "rule_invalid", index });
            continue;
        }

        const rawWord = value.word;
        const replacement = value.replacement;
        let word: string | undefined;

        if (typeof rawWord !== "string") {
            errors.push({ code: "word_invalid", index });
        } else {
            word = rawWord.trim();
            if (!word) {
                errors.push({ code: "word_blank", index });
            } else if (sensitiveWordCodePointLength(word) > SENSITIVE_WORD_MAX_CODE_POINTS) {
                errors.push({ code: "word_too_long", index });
            }

            if (word) {
                const key = foldSensitiveWordAscii(word);
                if (seen.has(key)) {
                    errors.push({ code: "word_duplicate", index });
                } else {
                    seen.add(key);
                }
            }
        }

        if (typeof replacement !== "string") {
            errors.push({ code: "replacement_invalid", index });
        } else if (sensitiveWordCodePointLength(replacement) > SENSITIVE_WORD_MAX_CODE_POINTS) {
            errors.push({ code: "replacement_too_long", index });
        }

        if (word !== undefined && typeof replacement === "string") {
            normalized.push({ word, replacement });
        }
    }

    return errors.length === 0
        ? { valid: true, rules: normalized, errors: [] }
        : { valid: false, rules: normalized, errors };
}

export function getSensitiveWordRevision(config: unknown): number {
    if (!isRecord(config)) return 0;
    return Number.isInteger(config.revision) && (config.revision as number) >= 1
        ? (config.revision as number)
        : 0;
}

function uniqueReasonCodes(reasonCodes: string[]): string[] {
    return [...new Set(reasonCodes)];
}

function inactivePolicy(
    source: SensitiveWordPolicySource,
    revision: number,
    enabled: boolean,
    applyToReasoning: boolean,
    rules: SensitiveWordReplacementRule[] = [],
    reasonCodes: string[] = [],
): ResolvedSensitiveWordPolicy {
    return {
        safe: true,
        active: false,
        source,
        revision,
        enabled,
        applyToReasoning,
        rules,
        reasonCodes: uniqueReasonCodes(reasonCodes),
    };
}

function normalizeStoredLegacyRules(config: UnknownRecord): {
    rules: SensitiveWordReplacementRule[];
    reasonCodes: string[];
} {
    const reasonCodes: string[] = [];
    const words = Array.isArray(config.words) ? config.words : [];
    if (!Array.isArray(config.words) && config.words !== undefined) {
        reasonCodes.push("legacy_words_invalid");
    }

    let replacement =
        typeof config.replacement === "string" && config.replacement.length > 0
            ? config.replacement
            : SENSITIVE_WORD_LEGACY_MASK;
    if (
        typeof replacement !== "string" ||
        sensitiveWordCodePointLength(replacement) > SENSITIVE_WORD_MAX_CODE_POINTS
    ) {
        replacement = SENSITIVE_WORD_LEGACY_MASK;
        reasonCodes.push("legacy_replacement_too_long");
    }

    const rules: SensitiveWordReplacementRule[] = [];
    const seen = new Set<string>();
    for (const candidate of words) {
        if (rules.length >= SENSITIVE_WORD_MAX_RULES) {
            reasonCodes.push("legacy_rule_limit");
            break;
        }
        if (typeof candidate !== "string") {
            reasonCodes.push("legacy_word_invalid");
            continue;
        }
        const word = candidate.trim();
        if (!word) {
            reasonCodes.push("legacy_word_blank");
            continue;
        }
        if (sensitiveWordCodePointLength(word) > SENSITIVE_WORD_MAX_CODE_POINTS) {
            reasonCodes.push("legacy_word_too_long");
            continue;
        }
        const key = foldSensitiveWordAscii(word);
        if (seen.has(key)) {
            reasonCodes.push("legacy_word_duplicate");
            continue;
        }
        seen.add(key);
        rules.push({ word, replacement });
    }

    return { rules, reasonCodes: uniqueReasonCodes(reasonCodes) };
}

function resolveMaskShadow(config: UnknownRecord): SensitiveWordReplacementRule[] | null {
    if (config.replacement !== SENSITIVE_WORD_LEGACY_MASK || !Array.isArray(config.words)) {
        return null;
    }
    const validation = validateSensitiveWordRules(
        config.words.map((word) => ({ word, replacement: SENSITIVE_WORD_LEGACY_MASK })),
    );
    return validation.valid && validation.rules.length > 0 ? validation.rules : null;
}

export function resolveStoredSensitiveWordPolicy(config: unknown): ResolvedSensitiveWordPolicy {
    if (!isRecord(config)) {
        return inactivePolicy("absent", 0, false, true);
    }

    const enabled = config.enabled === true;
    const applyToReasoning = config.applyToReasoning !== false;
    const revision = getSensitiveWordRevision(config);
    const isCanonical = Object.prototype.hasOwnProperty.call(config, "rules") || revision > 0;

    if (!enabled) {
        return inactivePolicy(isCanonical ? "canonical" : "legacy", revision, false, applyToReasoning);
    }

    if (isCanonical) {
        const canonical = validateSensitiveWordRules(config.rules);
        if (canonical.valid) {
            return canonical.rules.length === 0
                ? inactivePolicy("canonical", revision, true, applyToReasoning)
                : {
                      safe: true,
                      active: true,
                      source: "canonical",
                      revision,
                      enabled: true,
                      applyToReasoning,
                      rules: canonical.rules,
                      reasonCodes: [],
                  };
        }

        const shadow = resolveMaskShadow(config);
        if (shadow) {
            return {
                safe: true,
                active: true,
                source: "shadow",
                revision,
                enabled: true,
                applyToReasoning,
                rules: shadow,
                reasonCodes: ["canonical_rules_invalid"],
            };
        }

        return {
            safe: false,
            active: false,
            source: "invalid",
            revision,
            enabled: true,
            applyToReasoning,
            rules: [],
            reasonCodes: ["canonical_rules_invalid", "shadow_invalid"],
        };
    }

    const legacy = normalizeStoredLegacyRules(config);
    return legacy.rules.length === 0
        ? inactivePolicy("legacy", 0, true, applyToReasoning, [], legacy.reasonCodes)
        : {
              safe: true,
              active: true,
              source: "legacy",
              revision: 0,
              enabled: true,
              applyToReasoning,
              rules: legacy.rules,
              reasonCodes: legacy.reasonCodes,
          };
}

export function hydrateSensitiveWordDraft(
    config: SensitiveWordConfig | null | undefined,
): SensitiveWordDraft {
    const policy = resolveStoredSensitiveWordPolicy(config);
    return {
        enabled: config?.enabled === true,
        applyToReasoning: config?.applyToReasoning !== false,
        revision: policy.revision,
        rules: policy.rules.map((rule) => ({ ...rule })),
    };
}

export function buildSensitiveWordRequest(
    draft: SensitiveWordDraft,
    rules: unknown = draft.rules,
): { request?: SensitiveWordConfigUpdate; errors: SensitiveWordValidationError[] } {
    const validation = validateSensitiveWordRules(rules);
    if (!validation.valid) return { errors: validation.errors };
    return {
        errors: [],
        request: {
            enabled: draft.enabled,
            applyToReasoning: draft.applyToReasoning,
            expectedRevision: draft.revision,
            rules: validation.rules,
        },
    };
}

export function serializeSensitiveWordConfig(
    input: SensitiveWordCanonicalInput,
    revision: number,
): SensitiveWordConfig {
    const validation = validateSensitiveWordRules(input.rules);
    if (!validation.valid) {
        throw new Error("invalid_sensitive_word_rules");
    }
    if (!Number.isInteger(revision) || revision < 1) {
        throw new Error("invalid_sensitive_word_revision");
    }

    return {
        enabled: input.enabled === true,
        applyToReasoning: input.applyToReasoning !== false,
        revision,
        rules: validation.rules,
        words: validation.rules.map((rule) => rule.word),
        replacement: SENSITIVE_WORD_LEGACY_MASK,
    };
}

function rulesEqual(left: unknown, right: unknown): boolean {
    const leftValidation = validateSensitiveWordRules(left);
    const rightValidation = validateSensitiveWordRules(right);
    if (!leftValidation.valid || !rightValidation.valid) return false;
    if (leftValidation.rules.length !== rightValidation.rules.length) return false;
    return leftValidation.rules.every((rule, index) => {
        const other = rightValidation.rules[index];
        return other?.word === rule.word && other.replacement === rule.replacement;
    });
}

function stringArraysEqual(left: unknown, right: unknown): boolean {
    return (
        Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((value, index) => value === right[index])
    );
}

function configSwitchesEqual(left: SensitiveWordConfig, right: SensitiveWordConfig): boolean {
    return (
        left.enabled === right.enabled &&
        (left.applyToReasoning !== false) === (right.applyToReasoning !== false)
    );
}

function updateCanonicalSwitches(
    stored: SensitiveWordConfig,
    enabled: boolean,
    applyToReasoning: boolean,
): SensitiveWordCompatibilityUpdate {
    if (stored.enabled === enabled && (stored.applyToReasoning !== false) === applyToReasoning) {
        return { action: "noop", config: stored };
    }
    return {
        action: "write",
        config: serializeSensitiveWordConfig(
            { enabled, applyToReasoning, rules: stored.rules },
            getSensitiveWordRevision(stored) + 1,
        ),
    };
}

function normalizeStrictLegacyUpdate(value: UnknownRecord): SensitiveWordConfig | null {
    if (typeof value.enabled !== "boolean" || !Array.isArray(value.words)) return null;
    if (value.replacement !== undefined && typeof value.replacement !== "string") return null;
    if (value.applyToReasoning !== undefined && typeof value.applyToReasoning !== "boolean") {
        return null;
    }

    const replacement =
        typeof value.replacement === "string" && value.replacement.length > 0
            ? value.replacement
            : SENSITIVE_WORD_LEGACY_MASK;
    const validation = validateSensitiveWordRules(
        value.words.map((word) => ({ word, replacement })),
    );
    if (!validation.valid) return null;
    return {
        enabled: value.enabled,
        words: validation.rules.map((rule) => rule.word),
        replacement,
        applyToReasoning: value.applyToReasoning !== false,
    };
}

export function resolveSensitiveWordCompatibilityUpdate(
    storedValue: unknown,
    incomingValue: unknown,
): SensitiveWordCompatibilityUpdate {
    const stored = isRecord(storedValue) ? (storedValue as unknown as SensitiveWordConfig) : null;
    const storedRevision = getSensitiveWordRevision(stored);
    const hasCanonicalMarker =
        stored !== null &&
        (Object.prototype.hasOwnProperty.call(stored, "rules") || storedRevision > 0);
    const storedIsCanonical = hasCanonicalMarker && Array.isArray(stored?.rules);

    if (hasCanonicalMarker && !storedIsCanonical) {
        return { action: "conflict", reasonCode: "corrupt_canonical_storage" };
    }

    if (incomingValue === null) {
        if (!stored) return { action: "noop", config: null };
        if (storedIsCanonical) {
            return updateCanonicalSwitches(
                stored,
                false,
                stored.applyToReasoning !== false,
            );
        }
        const next = { ...stored, enabled: false };
        return configSwitchesEqual(stored, next)
            ? { action: "noop", config: stored }
            : { action: "write", config: next };
    }

    if (!isRecord(incomingValue)) {
        return { action: "conflict", reasonCode: "invalid_legacy_update" };
    }

    if (!storedIsCanonical) {
        const legacy = normalizeStrictLegacyUpdate(incomingValue);
        if (!legacy) return { action: "conflict", reasonCode: "invalid_legacy_update" };
        return JSON.stringify(stored) === JSON.stringify(legacy)
            ? { action: "noop", config: stored }
            : { action: "write", config: legacy };
    }

    const canonicalStored = stored as SensitiveWordConfig;

    if (Array.isArray(incomingValue.rules) || incomingValue.revision !== undefined) {
        if (!Number.isInteger(incomingValue.revision)) {
            return { action: "conflict", reasonCode: "invalid_canonical_echo" };
        }
        if ((incomingValue.revision as number) < storedRevision) {
            return { action: "ignore", reasonCode: "stale_canonical_echo" };
        }
        if ((incomingValue.revision as number) !== storedRevision) {
            return { action: "conflict", reasonCode: "invalid_canonical_echo" };
        }
        if (
            !rulesEqual(incomingValue.rules, canonicalStored.rules) ||
            !stringArraysEqual(incomingValue.words, canonicalStored.words) ||
            incomingValue.replacement !== SENSITIVE_WORD_LEGACY_MASK
        ) {
            return { action: "conflict", reasonCode: "canonical_echo_mutated" };
        }
        if (
            typeof incomingValue.enabled !== "boolean" ||
            (incomingValue.applyToReasoning !== undefined &&
                typeof incomingValue.applyToReasoning !== "boolean")
        ) {
            return { action: "conflict", reasonCode: "invalid_canonical_echo" };
        }
        return updateCanonicalSwitches(
            canonicalStored,
            incomingValue.enabled,
            incomingValue.applyToReasoning !== false,
        );
    }

    const legacy = normalizeStrictLegacyUpdate(incomingValue);
    if (!legacy) return { action: "conflict", reasonCode: "invalid_legacy_update" };

    const immediateReenable =
        canonicalStored.enabled === false && legacy.enabled === true && legacy.words?.length === 0;
    if (immediateReenable) {
        return updateCanonicalSwitches(
            canonicalStored,
            true,
            canonicalStored.applyToReasoning !== false,
        );
    }

    if (
        !stringArraysEqual(legacy.words, canonicalStored.words) ||
        legacy.replacement !== SENSITIVE_WORD_LEGACY_MASK
    ) {
        return { action: "conflict", reasonCode: "mapping_edit_requires_upgrade" };
    }
    return updateCanonicalSwitches(
        canonicalStored,
        legacy.enabled,
        legacy.applyToReasoning !== false,
    );
}
