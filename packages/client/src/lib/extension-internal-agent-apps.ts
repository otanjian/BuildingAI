/**
 * Extension apps that host their own agent dock in the iframe.
 * The parent /apps shell must not show the fixed right-edge AI FAB on these routes.
 *
 * Keep in sync with extensions/extensions.json.
 */
export const EXTENSION_INTERNAL_AGENT_APP_IDS = new Set<string>(["ehcs-ai"]);

export function getAppsRouteExtensionId(pathname: string): string | undefined {
  return pathname.match(/^\/apps\/([^/]+)/)?.[1];
}

export function appUsesInternalAgentDock(pathname: string): boolean {
  const id = getAppsRouteExtensionId(pathname);
  return id != null && EXTENSION_INTERNAL_AGENT_APP_IDS.has(id);
}
