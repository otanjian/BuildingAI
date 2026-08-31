import type {
  UpdateWecomAibotConnectionDto,
  WecomAibotConnectionState,
  WecomAibotConnectionStatus,
} from "@buildingai/services/console";

export interface WecomAgentSelectionOption {
  id: string;
  createMode?: string;
}

export function filterWecomAgents<T extends WecomAgentSelectionOption>(agents: T[]): T[] {
  return agents.filter((agent) => agent.createMode === "direct");
}

export function restoreWecomConnectionForm(connection: WecomAibotConnectionStatus) {
  return {
    agentId: connection.agentId,
    name: connection.name,
    botId: "",
    botIdPlaceholder: connection.botId,
    botSecret: "",
    agentAccessToken: "",
  };
}

export function buildWecomUpdateDto(values: {
  agentId: string;
  name: string;
  botId: string;
  botSecret: string;
  agentAccessToken: string;
  connectionId?: string;
}): UpdateWecomAibotConnectionDto {
  return {
    connectionId: values.connectionId,
    agentId: values.agentId || undefined,
    name: values.name.trim() || undefined,
    botId: values.botId.trim() || undefined,
    botSecret: values.botSecret.trim() || undefined,
    agentAccessToken: values.agentAccessToken.trim() || undefined,
  };
}

export const wecomConnectionStateLabels: Record<WecomAibotConnectionState, string> = {
  stopped: "未启动",
  connecting: "连接中",
  connected: "已连接",
  error: "异常",
};

export function buildWecomToggleTarget(connection: WecomAibotConnectionStatus) {
  return { id: connection.connectionId, enabled: !connection.enabled };
}
