import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("ap-opt-ai");

export { consoleHttpClient };
