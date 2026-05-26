import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("energy-carbon-ai");

export { consoleHttpClient };
