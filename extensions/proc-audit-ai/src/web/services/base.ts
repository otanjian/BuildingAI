import { createPluginHttpClients } from "@buildingai/services";

const { consoleHttpClient } = createPluginHttpClients("proc-audit-ai");

export { consoleHttpClient };
