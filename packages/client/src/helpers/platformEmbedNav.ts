import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AIPLATFORM_BAI_NAV = "aiplatform:bai-nav";
export const AIPLATFORM_BAI_READY = "aiplatform:bai-ready";

export function isAllowedPlatformOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostOk = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const portOk = url.port === "3000" || url.port === "";
    return hostOk && portOk && (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}

function ensureEmbedFlag(pathWithQuery: string): string {
  const url = new URL(pathWithQuery, window.location.origin);
  if (url.searchParams.get("_embed") !== "1") {
    url.searchParams.set("_embed", "1");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function isEmbedMode(): boolean {
  return (
    new URLSearchParams(window.location.search).get("_embed") === "1" ||
    sessionStorage.getItem("bai_embed") === "1"
  );
}

/** Persist embed flag so SPA navigations keep shell-less chrome. */
export function captureBuildingAiEmbedFlag(): void {
  if (new URLSearchParams(window.location.search).get("_embed") === "1") {
    sessionStorage.setItem("bai_embed", "1");
  }
}

export function postBuildingAiEmbedReady(targetOrigin = "*"): void {
  if (typeof window === "undefined") return;
  if (!isEmbedMode()) return;
  if (window.parent === window) return;
  window.parent.postMessage({ type: AIPLATFORM_BAI_READY }, targetOrigin);
}

/**
 * Listen for platform leaf navigation inside BuildingAI.
 * Mount once under the app router (e.g. MainLayout).
 */
export function usePlatformEmbedNavBridge(): void {
  const navigate = useNavigate();

  useEffect(() => {
    captureBuildingAiEmbedFlag();
    if (!isEmbedMode()) return;

    postBuildingAiEmbedReady();

    const onMessage = (event: MessageEvent) => {
      if (!isAllowedPlatformOrigin(event.origin)) return;
      const data = event.data;
      if (!data || data.type !== AIPLATFORM_BAI_NAV || typeof data.path !== "string") return;
      const next = ensureEmbedFlag(data.path);
      const url = new URL(next, window.location.origin);
      const current = `${window.location.pathname}${window.location.search}`;
      const target = `${url.pathname}${url.search}`;
      if (current === target) return;
      navigate({ pathname: url.pathname, search: url.search }, { replace: false });
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);
}
