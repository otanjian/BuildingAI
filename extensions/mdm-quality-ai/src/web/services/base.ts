import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("mdm-quality-ai");

export { consoleHttpClient };
