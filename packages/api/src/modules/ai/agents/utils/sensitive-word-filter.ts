import type {
    SensitiveWordConfig,
    SensitiveWordReplacementRule,
} from "@buildingai/types/ai/agent-config.interface";
import {
    resolveStoredSensitiveWordPolicy,
    type ResolvedSensitiveWordPolicy,
} from "@buildingai/utils/sensitive-word-config";
import { Logger } from "@nestjs/common";

type CodePoint = string;

const sensitiveWordLogger = new Logger("SensitiveWordFilter");

interface AcTerminal {
    wordLength: number;
    replacement: string;
}

interface AcNode {
    children: Map<CodePoint, AcNode>;
    fail: AcNode;
    output: AcNode | null;
    terminal: AcTerminal | null;
}

interface MatchInterval {
    start: number;
    end: number;
    replacement: string;
}

export class SensitiveWordConfigurationError extends Error {
    readonly reasonCodes: string[];

    constructor(reasonCodes: string[]) {
        super("Sensitive word replacement configuration is invalid");
        this.name = "SensitiveWordConfigurationError";
        this.reasonCodes = [...reasonCodes];
    }
}

function normalizeCodePoint(codePoint: CodePoint): CodePoint {
    const code = codePoint.codePointAt(0)!;
    return code >= 0x41 && code <= 0x5a ? String.fromCodePoint(code + 0x20) : codePoint;
}

function codePoints(value: string): CodePoint[] {
    return [...value];
}

/** Literal Aho-Corasick replacement engine with batch and incremental interfaces. */
export class SensitiveWordFilter {
    private readonly root: AcNode;
    readonly enabled: boolean;
    readonly policy: ResolvedSensitiveWordPolicy;

    constructor(config: SensitiveWordConfig | null | undefined, agentId?: string) {
        this.policy = resolveStoredSensitiveWordPolicy(config);
        if (this.policy.reasonCodes.length > 0) {
            sensitiveWordLogger.warn(
                `Sensitive word policy normalized agentId=${agentId ?? "unknown"} reasonCodes=${this.policy.reasonCodes.join(",")}`,
            );
        }
        if (!this.policy.safe) {
            throw new SensitiveWordConfigurationError(this.policy.reasonCodes);
        }
        this.enabled = this.policy.active && this.policy.rules.length > 0;
        this.root = this.buildTrie(this.enabled ? this.policy.rules : []);
    }

    filterText(input: string): string {
        if (!this.enabled || !input) return input;
        const inputCodePoints = codePoints(input);
        const intervals = this.matchIntervals(inputCodePoints);
        if (intervals.length === 0) return input;

        const output: string[] = [];
        let cursor = 0;
        for (const interval of intervals) {
            if (interval.start > cursor) {
                output.push(inputCodePoints.slice(cursor, interval.start).join(""));
            }
            output.push(interval.replacement);
            cursor = interval.end;
        }
        if (cursor < inputCodePoints.length) {
            output.push(inputCodePoints.slice(cursor).join(""));
        }
        return output.join("");
    }

    createStream(): {
        push: (delta: string) => string[];
        flush: () => string[];
    } {
        if (!this.enabled) {
            return {
                push: (delta: string) => (delta ? [delta] : []),
                flush: () => [],
            };
        }

        let pending: CodePoint[] = [];
        return {
            push: (delta: string) => {
                if (!delta) return [];
                pending.push(...codePoints(delta));
                const safeLength = this.computeSafePrefixLength(pending);
                if (safeLength <= 0) return [];

                const output = this.filterText(pending.slice(0, safeLength).join(""));
                pending = pending.slice(safeLength);
                return output ? [output] : [];
            },
            flush: () => {
                const output = this.filterText(pending.join(""));
                pending = [];
                return output ? [output] : [];
            },
        };
    }

    private computeSafePrefixLength(pending: CodePoint[]): number {
        let suffixStart = pending.length;
        for (let start = 0; start < pending.length; start += 1) {
            let node = this.root;
            let completePrefix = true;
            for (let index = start; index < pending.length; index += 1) {
                const child = node.children.get(normalizeCodePoint(pending[index]));
                if (!child) {
                    completePrefix = false;
                    break;
                }
                node = child;
            }
            if (completePrefix && node.children.size > 0) {
                suffixStart = start;
                break;
            }
        }

        if (suffixStart === pending.length) return pending.length;

        for (const interval of this.matchIntervals(pending)) {
            if (interval.end > suffixStart) {
                suffixStart = Math.min(suffixStart, interval.start);
            }
        }
        return suffixStart;
    }

    private buildTrie(rules: SensitiveWordReplacementRule[]): AcNode {
        const root: AcNode = {
            children: new Map(),
            fail: null as unknown as AcNode,
            output: null,
            terminal: null,
        };
        root.fail = root;

        for (const rule of rules) {
            let node = root;
            const word = codePoints(rule.word);
            for (const rawCodePoint of word) {
                const normalized = normalizeCodePoint(rawCodePoint);
                let child = node.children.get(normalized);
                if (!child) {
                    child = {
                        children: new Map(),
                        fail: root,
                        output: null,
                        terminal: null,
                    };
                    node.children.set(normalized, child);
                }
                node = child;
            }
            node.terminal = { wordLength: word.length, replacement: rule.replacement };
        }

        const queue: AcNode[] = [];
        for (const child of root.children.values()) {
            child.fail = root;
            queue.push(child);
        }
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const node = queue[cursor];
            node.output = node.fail.terminal ? node.fail : node.fail.output;
            for (const [codePoint, child] of node.children) {
                let fallback = node.fail;
                while (!fallback.children.has(codePoint) && fallback !== root) {
                    fallback = fallback.fail;
                }
                child.fail = fallback.children.get(codePoint) ?? root;
                queue.push(child);
            }
        }
        return root;
    }

    private matchIntervals(input: CodePoint[]): MatchInterval[] {
        const matches: MatchInterval[] = [];
        let node = this.root;
        for (let index = 0; index < input.length; index += 1) {
            const codePoint = normalizeCodePoint(input[index]);
            while (!node.children.has(codePoint) && node !== this.root) {
                node = node.fail;
            }
            node = node.children.get(codePoint) ?? this.root;

            let output: AcNode | null = node.terminal ? node : node.output;
            while (output) {
                const terminal = output.terminal!;
                matches.push({
                    start: index - terminal.wordLength + 1,
                    end: index + 1,
                    replacement: terminal.replacement,
                });
                output = output.output;
            }
        }

        matches.sort((left, right) => left.start - right.start || right.end - left.end);
        const selected: MatchInterval[] = [];
        for (const match of matches) {
            const previous = selected[selected.length - 1];
            if (previous && match.start < previous.end) continue;
            selected.push(match);
        }
        return selected;
    }
}

export function createSensitiveWordFilter(
    config: SensitiveWordConfig | null | undefined,
    agentId?: string,
): SensitiveWordFilter {
    return new SensitiveWordFilter(config, agentId);
}
