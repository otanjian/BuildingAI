import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("service-sla-ai");

export { consoleHttpClient };
