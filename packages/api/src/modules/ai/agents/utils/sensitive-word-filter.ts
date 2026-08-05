import type { SensitiveWordConfig } from "@buildingai/types/ai/agent-config.interface";

/**
 * Sensitive word filter engine.
 *
 * - Aho-Corasick automaton for multi-word O(n) matching.
 * - Longest-match-first, non-overlapping, left-to-right replacement.
 * - ASCII Latin (A-Z) matching is case-insensitive; other characters match exactly.
 * - Batch interface `filterText` for persisted-history filtering.
 * - Streaming interface `createStream` with a holdback buffer so words split
 *   across streamed deltas are still fully replaced (streaming result === batch result).
 */

/** A single code point (UTF-16 surrogate pair preserved as one unit). */
type Cp = string;

interface AcNode {
    children: Map<Cp, AcNode>;
    fail: AcNode;
    /** Nearest node on the fail chain that terminates a word (for output collection). */
    output: AcNode | null;
    /** Word length in code points when this node terminates a word, else 0. */
    wordLen: number;
}

/** Normalize a single code point: lowercase ASCII A-Z only (length-preserving). */
function normalizeChar(cp: Cp): Cp {
    const code = cp.codePointAt(0)!;
    if (code >= 0x41 && code <= 0x5a) {
        return String.fromCodePoint(code + 0x20);
    }
    return cp;
}

function codePoints(value: string): Cp[] {
    return [...value];
}

export class SensitiveWordFilter {
    private readonly root: AcNode;
    private readonly maxWordLen: number;
    private readonly replacement: string;
    readonly enabled: boolean;

    constructor(config: SensitiveWordConfig | null | undefined) {
        const words = (config?.words ?? []).filter((w) => typeof w === "string" && w.length > 0);
        this.enabled = words.length > 0;
        this.replacement =
            config?.replacement && config.replacement.length > 0 ? config.replacement : "***";
        this.root = this.buildTrie(words);
        this.maxWordLen = words.reduce((max, w) => Math.max(max, codePoints(w).length), 0);
    }

    /**
     * Replace all sensitive words in a full text.
     * Returns the input unchanged when the filter is disabled or no word matches.
     */
    filterText(input: string): string {
        if (!this.enabled || !input) return input;
        const cps = codePoints(input);
        const intervals = this.matchIntervals(cps);
        if (intervals.length === 0) return input;
        return this.replaceIntervals(cps, intervals);
    }

    /**
     * Create a streaming filter instance.
     * `push` returns output deltas for the determinable prefix of the buffer;
     * `flush` returns the remaining buffered text. Call `flush` before the
     * stream ends so trailing characters are not lost.
     */
    createStream(): {
        push: (delta: string) => string[];
        flush: () => string[];
    } {
        let pending = "";
        if (!this.enabled) {
            return {
                push: (delta: string) => (delta ? [delta] : []),
                flush: () => {
                    const rest = pending;
                    pending = "";
                    return rest ? [rest] : [];
                },
            };
        }
        const keep = Math.max(0, this.maxWordLen - 1);
        return {
            push: (delta: string) => {
                if (!delta) return [];
                pending += delta;
                const cps = codePoints(pending);
                if (cps.length <= keep) return [];
                const flushLen = this.computeSafePrefixLen(cps);
                if (flushLen <= 0) return [];
                const out = this.filterText(cps.slice(0, flushLen).join(""));
                pending = cps.slice(flushLen).join("");
                return out ? [out] : [];
            },
            flush: () => {
                const out = this.filterText(pending);
                pending = "";
                return out ? [out] : [];
            },
        };
    }

    /**
     * Length (in code points) of the buffer prefix that can be safely emitted:
     * the prefix must not contain the start of any word whose end falls into
     * the held-back suffix (otherwise that word would be split across outputs).
     */
    private computeSafePrefixLen(cps: Cp[]): number {
        const keep = Math.max(0, this.maxWordLen - 1);
        const flushLimit = cps.length - keep;
        if (flushLimit <= 0) return 0;
        let minStart = flushLimit;
        for (const [start, end] of this.matchIntervals(cps)) {
            if (end > flushLimit) {
                minStart = Math.min(minStart, start);
            }
        }
        return minStart;
    }

    /** Build the Aho-Corasick trie with fail links and output chains. */
    private buildTrie(words: string[]): AcNode {
        const root: AcNode = {
            children: new Map(),
            fail: null as unknown as AcNode,
            output: null,
            wordLen: 0,
        };
        root.fail = root;

        for (const word of words) {
            let node = root;
            for (const rawCp of codePoints(word)) {
                const cp = normalizeChar(rawCp);
                let child = node.children.get(cp);
                if (!child) {
                    child = {
                        children: new Map(),
                        fail: root,
                        output: null,
                        wordLen: 0,
                    };
                    node.children.set(cp, child);
                }
                node = child;
            }
            node.wordLen = codePoints(word).length;
        }

        // BFS to set fail links and output chains.
        const queue: AcNode[] = [];
        for (const child of root.children.values()) {
            child.fail = root;
            queue.push(child);
        }
        while (queue.length > 0) {
            const node = queue.shift()!;
            node.output = node.fail.wordLen > 0 ? node.fail : node.fail.output;
            for (const [cp, child] of node.children) {
                let fallback = node.fail;
                while (!fallback.children.has(cp) && fallback !== root) {
                    fallback = fallback.fail;
                }
                child.fail = fallback.children.get(cp) ?? root;
                queue.push(child);
            }
        }
        return root;
    }

    /**
     * Match all sensitive words in a code-point array.
     * Returns merged, non-overlapping intervals `[start, end)` (end exclusive),
     * longest match preferred, scanning left to right.
     */
    private matchIntervals(cps: Cp[]): Array<[number, number]> {
        const raw: Array<[number, number]> = [];
        let node = this.root;
        for (let i = 0; i < cps.length; i++) {
            const cp = normalizeChar(cps[i]);
            while (!node.children.has(cp) && node !== this.root) {
                node = node.fail;
            }
            node = node.children.get(cp) ?? this.root;
            let out = node.wordLen > 0 ? node : node.output;
            while (out) {
                raw.push([i - out.wordLen + 1, i + 1]);
                out = out.output;
            }
        }
        if (raw.length === 0) return raw;

        // Longest match first per start position, then greedy non-overlap merge.
        raw.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
        const merged: Array<[number, number]> = [];
        for (const interval of raw) {
            const last = merged[merged.length - 1];
            if (last && interval[0] < last[1]) continue;
            merged.push(interval);
        }
        return merged;
    }

    private replaceIntervals(cps: Cp[], intervals: Array<[number, number]>): string {
        const out: string[] = [];
        let cursor = 0;
        for (const [start, end] of intervals) {
            if (start > cursor) out.push(cps.slice(cursor, start).join(""));
            out.push(this.replacement);
            cursor = end;
        }
        if (cursor < cps.length) out.push(cps.slice(cursor).join(""));
        return out.join("");
    }
}

/** Build a filter from a per-agent config; disabled config yields a passthrough filter. */
export function createSensitiveWordFilter(
    config: SensitiveWordConfig | null | undefined,
): SensitiveWordFilter {
    if (!config?.enabled || !Array.isArray(config.words) || config.words.length === 0) {
        return new SensitiveWordFilter(null);
    }
    return new SensitiveWordFilter(config);
}
