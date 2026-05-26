import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("quality-rca-ai");

export { consoleHttpClient };
