import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("tax-compliance-ai");

export { consoleHttpClient };
