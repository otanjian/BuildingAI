import type { IconName } from "@buildingai/ui/components/lucide-icon";

/**
 * Secondary navigation tabs for the Taskview embed page.
 * Each tab maps to a view name and its display label + icon.
 *
 * Admin / account-level views (account, settings, integrations, webhooks,
 * messaging) are intentionally hidden from the top bar — they are managed
 * inside Taskview or not needed for the embedded workflow.
 */
export const TASKVIEW_TABS: Array<{
  viewName: string;
  label: string;
  icon: IconName;
}> = [
  { viewName: "tasks", label: "任务列表", icon: "list-checks" },
  { viewName: "kanban", label: "看板", icon: "kanban" },
  { viewName: "graph", label: "图表", icon: "git-graph" },
  { viewName: "sprints", label: "冲刺", icon: "timer" },
  { viewName: "collaboration", label: "协作", icon: "users" },
  { viewName: "project-time-reports", label: "项目时间报告", icon: "clock" },
  { viewName: "analytics", label: "分析", icon: "chart-bar" },
  { viewName: "time-reports", label: "时间报告", icon: "calendar-clock" },
];

/**
 * Map BuildingAI view names to Taskview route templates.
 * Some views require a projectId; we use "default" as a placeholder
 * that Taskview will handle via its own redirect logic.
 *
 * Note: this map intentionally keeps ALL views (including admin ones hidden
 * from the top tabs) so deep links and sidebar menu items still work.
 */
const TASKVIEW_ROUTE_MAP: Record<string, string> = {
  tasks: "/{orgSlug}/default",
  kanban: "/{orgSlug}/default/kanban",
  graph: "/{orgSlug}/default/graph",
  sprints: "/{orgSlug}/default/sprints",
  collaboration: "/{orgSlug}/default/collaboration",
  integrations: "/{orgSlug}/default/integrations",
  webhooks: "/{orgSlug}/default/webhooks",
  messaging: "/{orgSlug}/default/messaging",
  "project-time-reports": "/{orgSlug}/default/time-reports",
  analytics: "/{orgSlug}/analytics",
  "time-reports": "/{orgSlug}/time-reports",
  settings: "/{orgSlug}/settings",
  account: "/{orgSlug}/account",
};

/**
 * Encode a JWT token for safe transport in an iframe URL query parameter.
 */
export function encodeTokenForIframe(token: string): string {
  try {
    return btoa(token);
  } catch {
    return btoa(encodeURIComponent(token));
  }
}

/**
 * Check whether a view name is a known Taskview view.
 * Includes admin views hidden from the top tabs (reachable via sidebar/deep link).
 */
export function isKnownTaskviewView(viewName: string): boolean {
  return viewName in TASKVIEW_ROUTE_MAP;
}

/**
 * Resolve a view name to the concrete Taskview route path for an org.
 * Unknown views fall back to the default tasks route.
 */
export function getTaskviewRoutePath(viewName: string, orgSlug: string): string {
  const routeTemplate = TASKVIEW_ROUTE_MAP[viewName] ?? TASKVIEW_ROUTE_MAP["tasks"];
  return routeTemplate.replace("{orgSlug}", orgSlug);
}

/**
 * Build the Taskview iframe src for a view.
 *
 * - Keeps the base URL path prefix (see resolveTaskviewUrl).
 * - Passes the Taskview access token via `_t` (base64).
 * - Optionally passes the Taskview refresh token via `_r` so the iframe can
 *   renew its access token without forcing the user to log in again.
 */
export function buildTaskviewIframeSrc(
  baseUrl: string,
  orgSlug: string,
  taskviewToken: string,
  taskviewRefreshToken?: string,
  routePath: string = getTaskviewRoutePath("tasks", orgSlug),
): string {
  const base = `${baseUrl.replace(/\/+$/, "")}/`;
  const url = new URL(routePath.replace(/^\/+/, ""), base);
  url.searchParams.set("_t", encodeTokenForIframe(taskviewToken));
  if (taskviewRefreshToken) {
    url.searchParams.set("_r", encodeTokenForIframe(taskviewRefreshToken));
  }
  return url.toString();
}
