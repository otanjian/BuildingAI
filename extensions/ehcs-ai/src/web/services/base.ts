import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("ehcs-ai");

export { consoleHttpClient };
