import { childRequestContext, createRequestContext } from "./request-context";

describe("request context", () => {
    it("creates stable request and correlation identifiers", () => {
        const context = createRequestContext({ requestId: "req-1" });
        expect(context.requestId).toBe("req-1");
        expect(context.correlationId).toBe("req-1");
    });

    it("keeps correlation through child boundaries", () => {
        const parent = createRequestContext({ requestId: "req-1", correlationId: "corr-1", tenantId: "t-1" });
        expect(childRequestContext(parent, { requestId: "worker-1" })).toMatchObject({ requestId: "worker-1", correlationId: "corr-1", tenantId: "t-1" });
    });
});
