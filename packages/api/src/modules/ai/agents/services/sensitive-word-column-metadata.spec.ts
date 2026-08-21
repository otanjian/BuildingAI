describe("Agent sensitive-word column metadata", () => {
    it("excludes the sensitive JSON column from ordinary ORM updates", () => {
        jest.isolateModules(() => {
        jest.doMock("callsites", () => ({ __esModule: true, default: () => [] }));
        const { Agent } = jest.requireActual("@buildingai/db/entities/ai-agent.entity");
        const { getMetadataArgsStorage } = jest.requireActual("@buildingai/db/typeorm");
        const column = getMetadataArgsStorage().columns.find(
            (candidate) => candidate.target === Agent && candidate.propertyName === "sensitiveWordConfig",
        );

        expect(column).toBeDefined();
        expect(column?.options.update).toBe(false);
        });
    });
});
