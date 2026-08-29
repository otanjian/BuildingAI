/**
 * BullMQ custom job IDs cannot contain `:` (the durable dispatch key deliberately can). Keep the
 * database key unchanged and encode it only at the queue boundary so retries/reconciliation use
 * one deterministic, BullMQ-compatible identity.
 */
export function automationQueueJobId(dispatchKey: string): string {
    return `automation_${Buffer.from(dispatchKey, "utf8").toString("base64url")}`;
}
