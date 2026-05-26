import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("ar-risk-ai");

export { consoleHttpClient };
