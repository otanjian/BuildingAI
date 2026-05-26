import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("fx-risk-ai");

export { consoleHttpClient };
