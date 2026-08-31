export type IndexCutoverState = "legacy" | "shadow" | "active" | "rolled_back";

export type IndexCutoverResult = {
    from: IndexCutoverState;
    to: IndexCutoverState;
    rollbackSafe: boolean;
    reason: string;
};

/** Deterministic, non-destructive rehearsal used before enabling a new vector index. */
export function rehearseIndexCutover(
    current: IndexCutoverState,
    target: Exclude<IndexCutoverState, "rolled_back">,
    checks: { shadowMatch: boolean; health: boolean },
): IndexCutoverResult {
    if (current === "rolled_back") {
        return { from: current, to: current, rollbackSafe: true, reason: "already_rolled_back" };
    }
    if (target === "active" && (!checks.shadowMatch || !checks.health)) {
        return { from: current, to: "rolled_back", rollbackSafe: true, reason: "gate_failed" };
    }
    return { from: current, to: target, rollbackSafe: true, reason: "checks_passed" };
}
