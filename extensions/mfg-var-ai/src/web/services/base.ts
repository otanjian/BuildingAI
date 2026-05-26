import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("mfg-var-ai");

export { consoleHttpClient };
