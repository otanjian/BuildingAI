import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("forecast-ai");

export { consoleHttpClient };
