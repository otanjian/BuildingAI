import type { WecomAibotConnectionStatus } from "@buildingai/services/console";
import { describe, expect, it } from "vitest";

import {
  buildWecomToggleTarget,
  buildWecomUpdateDto,
  filterWecomAgents,
  restoreWecomConnectionForm,
  wecomConnectionStateLabels,
} from "./model";

const connection: WecomAibotConnectionStatus = {
  connectionId: "connection-2",
  name: "Customer Service",
  agentId: "agent-1",
  botId: "bot-••••3456",
  enabled: true,
  connectionState: "connected",
  hasBotSecret: true,
  hasAgentAccessToken: true,
};

describe("WeCom connection form model", () => {
  it("only offers standard agents", () => {
    expect(
      filterWecomAgents([
        { id: "direct", createMode: "direct" },
        { id: "opencode", createMode: "opencode" },
        { id: "third-party", createMode: "coze" },
      ]),
    ).toEqual([{ id: "direct", createMode: "direct" }]);
  });

  it("restores edit identity but keeps masked credentials out of inputs", () => {
    expect(restoreWecomConnectionForm(connection)).toEqual({
      agentId: "agent-1",
      name: "Customer Service",
      botId: "",
      botIdPlaceholder: "bot-••••3456",
      botSecret: "",
      agentAccessToken: "",
    });
  });

  it("omits blank masked fields from update payloads", () => {
    expect(
      buildWecomUpdateDto({
        connectionId: "connection-2",
        agentId: "agent-1",
        name: " Renamed ",
        botId: "",
        botSecret: "",
        agentAccessToken: "",
      }),
    ).toEqual({
      connectionId: "connection-2",
      agentId: "agent-1",
      name: "Renamed",
      botId: undefined,
      botSecret: undefined,
      agentAccessToken: undefined,
    });
  });

  it("labels runtime state and targets actions by connection ID", () => {
    expect(wecomConnectionStateLabels.error).toBe("异常");
    expect(buildWecomToggleTarget(connection)).toEqual({
      id: "connection-2",
      enabled: false,
    });
  });
});
