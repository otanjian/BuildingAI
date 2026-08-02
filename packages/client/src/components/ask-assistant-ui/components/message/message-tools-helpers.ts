export type ToolPartLike = {
  type?: string;
  toolCallId?: string;
  state?: string;
  toolName?: string;
};

const COMPLETED_STATES = new Set(["output-available", "output-error", "output-denied"]);

export function isCompletedToolState(state?: string): boolean {
  return Boolean(state && COMPLETED_STATES.has(state));
}

/**
 * Split tool parts so finished calls can be collapsed behind a single toggle.
 */
export function partitionToolPartsForDisplay<T extends ToolPartLike>(parts: T[]) {
  const completed: T[] = [];
  const active: T[] = [];

  for (const part of parts) {
    if (isCompletedToolState(part.state)) {
      completed.push(part);
    } else {
      active.push(part);
    }
  }

  return {
    completed,
    active,
    shouldCollapseCompleted: completed.length > 0,
  };
}
