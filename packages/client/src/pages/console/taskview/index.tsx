import { useAuthStore } from "@buildingai/stores";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const TASKVIEW_BASE_URL = "http://localhost:5174";

/**
 * Map BuildingAI menu paths to Taskview routes.
 * Some views require a projectId; we use a placeholder that Taskview will handle.
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

function encodeTokenForIframe(token: string): string {
  try {
    return btoa(token);
  } catch {
    return btoa(encodeURIComponent(token));
  }
}

export default function TaskviewIframePage() {
  const { "*": wildcard } = useParams();
  const userInfo = useAuthStore((state) => state.auth.userInfo);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  const viewName = wildcard?.split("/")[0] ?? "tasks";
  const taskviewToken = userInfo?.taskviewToken;
  const orgSlug = userInfo?.taskviewOrgSlug;

  const iframeSrc = (() => {
    if (!taskviewToken || !orgSlug) return "";

    const routeTemplate = TASKVIEW_ROUTE_MAP[viewName] ?? TASKVIEW_ROUTE_MAP["tasks"];
    const path = routeTemplate.replace("{orgSlug}", orgSlug);

    const url = new URL(path, TASKVIEW_BASE_URL);
    url.searchParams.set("_t", encodeTokenForIframe(taskviewToken));

    return url.toString();
  })();

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const onLoad = () => setLoading(false);
      iframe.addEventListener("load", onLoad);
      return () => iframe.removeEventListener("load", onLoad);
    }
  }, []);

  if (!taskviewToken || !orgSlug) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">
          Unable to connect to Taskview. Please try logging out and back in.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
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
  );
}
