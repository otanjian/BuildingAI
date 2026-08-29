import { nextOccurrence, parseSchedule } from "./schedule-calculator";

describe("automation schedule calculator", () => {
    it("rejects invalid schedules and unsafe intervals", () => {
        expect(() => parseSchedule({ kind: "cron", expression: "* * *", timezone: "UTC" })).toThrow();
        expect(() => parseSchedule({ kind: "every", intervalSeconds: 10, anchorAt: "2030-01-01T00:00:00Z" })).toThrow();
        expect(() => parseSchedule({ kind: "cron", expression: "0 9 * * *", timezone: "Not/AZone" })).toThrow();
    });

    it("keeps every schedules anchored and does not drift after a slow run", () => {
        const schedule = parseSchedule({
            kind: "every",
            intervalSeconds: 3600,
            anchorAt: "2030-01-01T00:00:00Z",
        });
        expect(nextOccurrence(schedule, new Date("2030-01-01T00:10:00Z"))?.toISOString()).toBe(
            "2030-01-01T01:00:00.000Z",
        );
        expect(nextOccurrence(schedule, new Date("2030-01-01T01:55:00Z"))?.toISOString()).toBe(
            "2030-01-01T02:00:00.000Z",
        );
    });

    it("does not skip an anchor that is still in the future", () => {
        const schedule = parseSchedule({
            kind: "every",
            intervalSeconds: 3600,
            anchorAt: "2030-01-01T01:00:00Z",
        });
        expect(nextOccurrence(schedule, new Date("2030-01-01T00:10:00Z"))?.toISOString()).toBe(
            "2030-01-01T01:00:00.000Z",
        );
    });

    it("normalizes cron calculations to minute boundaries", () => {
        const schedule = parseSchedule({ kind: "cron", expression: "* * * * *", timezone: "UTC" });
        expect(nextOccurrence(schedule, new Date("2030-01-01T00:00:30Z"))?.toISOString()).toBe(
            "2030-01-01T00:01:00.000Z",
        );
    });

    it("calculates cron in the requested timezone across a DST boundary", () => {
        const schedule = parseSchedule({
            kind: "cron",
            expression: "30 2 * * *",
            timezone: "America/New_York",
        });
        const next = nextOccurrence(schedule, new Date("2024-03-10T00:00:00Z"));
        expect(next && next.toISOString()).toBe("2024-03-11T06:30:00.000Z");
    });

    it("completes one-shot schedules", () => {
        const schedule = parseSchedule({ kind: "at", at: "2030-01-01T00:00:00Z" }, { now: new Date("2029-01-01") });
        expect(nextOccurrence(schedule, new Date("2029-12-31T23:59:00Z"))?.toISOString()).toBe(
            "2030-01-01T00:00:00.000Z",
        );
        expect(nextOccurrence(schedule, new Date("2030-01-01T00:00:00Z"))).toBeNull();
    });
});
