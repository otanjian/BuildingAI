import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("project-health-ai");

export { consoleHttpClient };
