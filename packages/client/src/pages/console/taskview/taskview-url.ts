/**
 * Resolve a Taskview route path against the Taskview base URL.
 *
 * The route paths in TASKVIEW_ROUTE_MAP start with "/" (e.g. "/{orgSlug}/default"),
 * and the base URL may or may not include a path prefix (e.g.
 * "https://ai.bosofts.com/taskview-web"). Naively passing an absolute path to
 * `new URL(path, base)` resolves it against the host root and silently drops
 * the base's path prefix, so the iframe would load the wrong app entirely.
 *
 * We normalize the base to end with "/" and strip the leading "/" from the
 * route path so the result is always `<base>/<routePath>`.
 */
export function resolveTaskviewUrl(baseUrl: string, routePath: string): string {
  const base = `${baseUrl.replace(/\/+$/, "")}/`;
  return new URL(routePath.replace(/^\/+/, ""), base).toString();
}
