import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("budget-control-ai");

export { consoleHttpClient };
