import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("channel-inv-ai");

export { consoleHttpClient };
