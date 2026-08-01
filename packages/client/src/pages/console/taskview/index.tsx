import { useAuthStore } from "@buildingai/stores";
import { LucideIcon } from "@buildingai/ui/components/lucide-icon";
import { Tabs, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  buildTaskviewIframeSrc,
  getTaskviewRoutePath,
  isKnownTaskviewView,
  TASKVIEW_TABS,
} from "./taskview-iframe";

/**
 * Taskview base URL, configurable via environment variable.
 * Defaults to the Vite dev server URL for local development.
 */
const TASKVIEW_BASE_URL = import.meta.env.VITE_TASKVIEW_BASE_URL || "http://localhost:5174";

/**
 * Message type sent to the Taskview iframe to navigate without reloading.
 * Mirrors the AppIframePage protocol ({ type: "parent-navigate", path }).
 */
export const TASKVIEW_NAV_MESSAGE = "parent-navigate";

/**
 * Extract the taskview view name from the current URL path.
 *
 * Uses useLocation to parse the path directly, avoiding the fragile
 * dependency on useParams wildcard capture which can break when
 * exact routes (from generateRoutes) shadow the wildcard route.
 */
function useViewName(): string {
  const location = useLocation();
  return useMemo(() => {
    // Path is /taskview/<viewName> or /taskview/<viewName>/...
    const segments = location.pathname.replace(/^\/taskview\/?/, "").split("/");
    const name = segments[0];
    if (name && isKnownTaskviewView(name)) return name;
    return "tasks";
  }, [location.pathname]);
}

export default function TaskviewIframePage() {
  const viewName = useViewName();
  const navigate = useNavigate();
  const userInfo = useAuthStore((state) => state.auth.userInfo);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  const taskviewToken = userInfo?.taskviewToken;
  const taskviewRefreshToken = userInfo?.taskviewRefreshToken;
  const orgSlug = userInfo?.taskviewOrgSlug;

  // Pin the view rendered on first mount so the iframe loads exactly once.
  // Subsequent tab switches navigate inside the iframe via postMessage.
  const [initialViewName] = useState(() => viewName);

  const iframeSrc = useMemo(() => {
    if (!taskviewToken || !orgSlug) return "";

    const initialPath = getTaskviewRoutePath(initialViewName, orgSlug);
    return buildTaskviewIframeSrc(
      TASKVIEW_BASE_URL,
      orgSlug,
      taskviewToken,
      taskviewRefreshToken,
      initialPath,
    );
  }, [taskviewToken, taskviewRefreshToken, orgSlug, initialViewName]);

  // Stop showing the loading overlay once the iframe has loaded.
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const onLoad = () => setLoading(false);
      iframe.addEventListener("load", onLoad);
      return () => iframe.removeEventListener("load", onLoad);
    }
  }, []);

  // After the iframe loads, sync it to the current URL view. This covers
  // browser back/forward and direct deep links to a specific view.
  useEffect(() => {
    if (loading || !orgSlug) return;
    if (viewName === initialViewName) return;

    const path = getTaskviewRoutePath(viewName, orgSlug);
    iframeRef.current?.contentWindow?.postMessage({ type: TASKVIEW_NAV_MESSAGE, path }, "*");
  }, [viewName, initialViewName, loading, orgSlug]);

  /**
   * Switch view without reloading the iframe: update the parent URL for
   * shareability, then ask Taskview to navigate internally.
   */
  const handleTabChange = (value: string) => {
    navigate(`/taskview/${value}`, { replace: true });
    if (!orgSlug) return;

    const path = getTaskviewRoutePath(value, orgSlug);
    iframeRef.current?.contentWindow?.postMessage({ type: TASKVIEW_NAV_MESSAGE, path }, "*");
  };

  // While credentials are still loading (e.g. userInfo not fetched yet after login),
  // show a loading state instead of an error so the user doesn't see a flash of
  // "Unable to connect" before the API response arrives.
  if (!taskviewToken || !orgSlug) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-muted-foreground animate-pulse">正在连接我的待办...</div>
        <p className="text-muted-foreground text-sm">Connecting to Taskview...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Secondary navigation tabs */}
      <div className="bg-background border-b px-2">
        <Tabs value={viewName} onValueChange={handleTabChange}>
          <TabsList className="h-10 w-full justify-start gap-0 overflow-x-auto rounded-none border-b-0 bg-transparent p-0">
            {TASKVIEW_TABS.map((tab) => (
              <TabsTrigger
                key={tab.viewName}
                value={tab.viewName}
                className="data-[state=active]:border-primary h-10 shrink-0 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <LucideIcon name={tab.icon} className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Iframe content area */}
      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="bg-background absolute inset-0 z-10 flex items-center justify-center">
            <div className="text-muted-foreground animate-pulse">Loading Taskview...</div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="h-full w-full border-0"
          title="Taskview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
