import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("hr-compliance-ai");

export { consoleHttpClient };
