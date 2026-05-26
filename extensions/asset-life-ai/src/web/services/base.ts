import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("asset-life-ai");

export { consoleHttpClient };
