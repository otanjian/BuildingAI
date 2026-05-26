import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("esg-report-ai");

export { consoleHttpClient };
