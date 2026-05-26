import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("inv-opt-ai");

export { consoleHttpClient };
