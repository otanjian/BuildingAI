jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("@buildingai/decorators/playground.decorator", () => ({
    Playground: () => () => undefined,
}));
jest.mock(
    "@common/decorators/controller.decorator",
    () => ({ WebController: () => (target: unknown) => target }),
    { virtual: true },
);
jest.mock(
    "@common/decorators/agent-public-access.decorator",
    () => ({ AgentPublicAccess: () => () => undefined }),
    { virtual: true },
);
jest.mock("../../services/opencode-turn-acceptance.service", () => ({
    OpencodeTurnAcceptanceService: class OpencodeTurnAcceptanceService {},
}));

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
import { ValidationPipe } from "@nestjs/common";

const CONTROLLER_PATH = resolve(__dirname, "opencode-turn.controller.ts");
const DTO_PATH = resolve(__dirname, "../../dto/web/chat/opencode-turn.dto.ts");
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";
const TURN_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";

function loadCreatedModule<T>(modulePath: string): T | undefined {
    expect(existsSync(modulePath)).toBe(true);
    if (!existsSync(modulePath)) return undefined;
    return require(modulePath) as T;
}

describe("OpencodeTurnRequestDto", () => {
    it("accepts client-generated UUIDs and exactly one current user command", async () => {
        const module = loadCreatedModule<Record<string, any>>(DTO_PATH);
        if (!module) return;

        const dto = Object.assign(new module.OpencodeTurnRequestDto(), {
            turnId: TURN_ID,
            conversationId: CONVERSATION_ID,
            message: { role: "user", parts: [{ type: "text", text: "hello" }] },
            formVariables: { company: "Bowi" },
            formFieldsInputs: { region: "cn" },
            isDebug: false,
        });
        await expect(validate(dto)).resolves.toEqual([]);
    });

    it.each([
        ["turnId", "not-a-uuid"],
        ["conversationId", "not-a-uuid"],
    ])("rejects an invalid %s", async (field, value) => {
        const module = loadCreatedModule<Record<string, any>>(DTO_PATH);
        if (!module) return;

        const dto = Object.assign(new module.OpencodeTurnRequestDto(), {
            turnId: TURN_ID,
            conversationId: CONVERSATION_ID,
            message: { role: "user", parts: [{ type: "text", text: "hello" }] },
            [field]: value,
        });
        const errors = await validate(dto);
        expect(errors.map((error) => error.property)).toContain(field);
    });

    it.each([
        ["assistant", { role: "assistant", parts: [{ type: "text", text: "bad" }] }],
        ["tool", { role: "tool", parts: [] }],
        ["empty", { role: "user", parts: [] }],
        [
            "nested parent override",
            {
                role: "user",
                parentId: "55555555-5555-4555-8555-555555555555",
                parts: [{ type: "text", text: "bad" }],
            },
        ],
        [
            "nested tool approval",
            {
                role: "user",
                parts: [{ type: "text", text: "bad", toolApproval: { approved: true } }],
            },
        ],
    ])("rejects %s message input", async (_case, message) => {
        const module = loadCreatedModule<Record<string, any>>(DTO_PATH);
        if (!module) return;

        const dto = Object.assign(new module.OpencodeTurnRequestDto(), {
            turnId: TURN_ID,
            conversationId: CONVERSATION_ID,
            message,
        });
        const errors = await validate(dto);
        expect(errors.map((error) => error.property)).toContain("message");
    });

    it.each(["messages", "history", "parentId", "trigger", "messageId", "toolApproval"])(
        "rejects the browser-owned %s field",
        async (field) => {
            const module = loadCreatedModule<Record<string, any>>(DTO_PATH);
            if (!module) return;

            const pipe = new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            });
            const value = plainToInstance(module.OpencodeTurnRequestDto, {
                turnId: TURN_ID,
                conversationId: CONVERSATION_ID,
                message: { role: "user", parts: [{ type: "text", text: "hello" }] },
                [field]: "browser-owned",
            });
            const rejection = await pipe
                .transform(value, { type: "body", metatype: module.OpencodeTurnRequestDto })
                .catch((error) => error);
            expect(rejection.getStatus()).toBe(400);
            expect(JSON.stringify(rejection.getResponse())).toContain(field);
        },
    );
});

describe("OpencodeTurnWebController", () => {
    function createController(module: Record<string, any>) {
        const acceptance = {
            accept: jest.fn(async (value) => ({ ...value, status: "accepted" })),
            getStatus: jest.fn(async (value) => ({ ...value, status: "running" })),
            requestCancel: jest.fn(async (value) => ({
                ...value,
                status: "running",
                cancelRequested: true,
            })),
            replyQuestion: jest.fn(async (value) => ({ ...value, status: "running" })),
            rejectQuestion: jest.fn(async (value) => ({ ...value, status: "running" })),
        };
        return {
            acceptance,
            controller: new module.OpencodeTurnWebController(acceptance),
        };
    }

    it("returns HTTP 202 and forwards registered ownership", async () => {
        const module = loadCreatedModule<Record<string, any>>(CONTROLLER_PATH);
        if (!module) return;

        const { controller, acceptance } = createController(module);
        const dto = {
            turnId: TURN_ID,
            conversationId: CONVERSATION_ID,
            message: { role: "user", parts: [{ type: "text", text: "hello" }] },
        };
        const result = await controller.acceptTurn(AGENT_ID, dto, { id: USER_ID }, { headers: {} });

        expect(Reflect.getMetadata(HTTP_CODE_METADATA, controller.acceptTurn)).toBe(202);
        expect(acceptance.accept).toHaveBeenCalledWith({
            agentId: AGENT_ID,
            userId: USER_ID,
            anonymousIdentifier: undefined,
            ...dto,
        });
        expect(result).toMatchObject({ turnId: TURN_ID, conversationId: CONVERSATION_ID });
    });

    it("forwards anonymous ownership on accept and status", async () => {
        const module = loadCreatedModule<Record<string, any>>(CONTROLLER_PATH);
        if (!module) return;

        const { controller, acceptance } = createController(module);
        const req = { headers: { "x-anonymous-identifier": " anonymous-owner " } };
        await controller.acceptTurn(
            AGENT_ID,
            {
                turnId: TURN_ID,
                conversationId: CONVERSATION_ID,
                message: { role: "user", parts: [{ type: "text", text: "hello" }] },
            },
            { id: USER_ID },
            req,
        );
        await controller.getTurnStatus(AGENT_ID, TURN_ID, { id: USER_ID }, req);

        expect(acceptance.accept).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: USER_ID,
                anonymousIdentifier: "anonymous-owner",
            }),
        );
        expect(acceptance.getStatus).toHaveBeenCalledWith({
            agentId: AGENT_ID,
            turnId: TURN_ID,
            userId: USER_ID,
            anonymousIdentifier: "anonymous-owner",
        });
        await controller.stopTurn(AGENT_ID, TURN_ID, { id: USER_ID }, req);
        expect(acceptance.requestCancel).toHaveBeenCalledWith({
            agentId: AGENT_ID,
            turnId: TURN_ID,
            userId: USER_ID,
            anonymousIdentifier: "anonymous-owner",
        });
    });

    it("forwards exact question answers and reject ownership", async () => {
        const module = loadCreatedModule<Record<string, any>>(CONTROLLER_PATH);
        if (!module) return;
        const { controller, acceptance } = createController(module);
        const req = { headers: { "x-anonymous-identifier": "anonymous-owner" } };
        await controller.replyQuestion(
            AGENT_ID,
            TURN_ID,
            { requestId: "que_1", answers: [["Bowi"]] },
            { id: USER_ID },
            req,
        );
        await controller.rejectQuestion(
            AGENT_ID,
            TURN_ID,
            { requestId: "que_1" },
            { id: USER_ID },
            req,
        );
        expect(acceptance.replyQuestion).toHaveBeenCalledWith({
            agentId: AGENT_ID,
            turnId: TURN_ID,
            requestId: "que_1",
            answers: [["Bowi"]],
            userId: USER_ID,
            anonymousIdentifier: "anonymous-owner",
        });
        expect(acceptance.rejectQuestion).toHaveBeenCalledWith(
            expect.objectContaining({
                agentId: AGENT_ID,
                requestId: "que_1",
                anonymousIdentifier: "anonymous-owner",
            }),
        );
    });
});
