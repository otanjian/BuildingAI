import { fetchWebExtensionDetail } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import NotFoundPage from "@buildingai/ui/components/exception/not-found-page";
import { Loader } from "@buildingai/ui/components/loader";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

/**
 * Resolve the base URL for extension iframe.
 * - Dev: uses VITE_DEVELOP_APP_BASE_URL or falls back to localhost:4090
 * - Prod: uses current origin (same domain)
 */
/** Extension iframe base URL (dev: proxied via Vite on the client port). */
function getExtensionBaseUrl() {
  return window.location.origin;
}

function isNotFoundError(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error && error.status === 404);
}

/** Map extension iframe pathname to /apps/:identifier sub-path. */
function toAppSubPath(identifier: string, path: string): string {
  const raw = path.trim();
  if (!raw || raw === "/") {
    return "";
  }
  const prefixes = [`/extension/${identifier}`, `extension/${identifier}`];
  for (const prefix of prefixes) {
    if (raw === prefix || raw === `${prefix}/`) {
      return "";
    }
    if (raw.startsWith(`${prefix}/`)) {
      return raw.slice(prefix.length);
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function encodeTokenForIframe(token: string): string {
  try {
    return btoa(token);
  } catch {
    return btoa(encodeURIComponent(token));
  }
}

export default function AppIframePage() {
  const { identifier, "*": wildcard } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.auth.token);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isIframeNavigatingRef = useRef(false);
  const [extensionRouteNotFoundUrl, setExtensionRouteNotFoundUrl] = useState<string | null>(null);
  const {
    error: extensionLoadError,
    isError: isExtensionLoadError,
    isLoading: isExtensionLoading,
  } = useQuery({
    queryKey: ["web", "extension", "detail", identifier],
    queryFn: () => fetchWebExtensionDetail(identifier || "", { silent: true }),
    enabled: !!identifier,
    retry: false,
  });
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  const iframeSrc = useMemo(() => {
    if (!identifier) return "";
    const subPath = wildcard ? `/${wildcard}` : "";
    const url = new URL(
      `/extension/${identifier}${subPath}`,
      getExtensionBaseUrl(),
    );
    const search = new URLSearchParams(location.search);
    search.forEach((value, key) => {
      if (key === "appChat") {
        return;
      }
      url.searchParams.set(key, value);
    });
    if (token) {
      url.searchParams.set("_t", encodeTokenForIframe(token));
    }
    url.hash = location.hash;
    return url.toString();
  }, [identifier, wildcard, location.search, location.hash, token]);

  // Listen for navigation messages from iframe (iframe → parent sync)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data?.type === "extension-not-found") {
        if (!identifier) return;

        const path = toAppSubPath(identifier, event.data.path ?? "");
        // Root miss is handled inside the iframe; do not replace the parent page with 404.
        if (!path) {
          return;
        }

        const search = event.data.search ?? "";
        const hash = event.data.hash ?? "";
        const newUrl = `/apps/${identifier}${path}${search}${hash}`;

        setExtensionRouteNotFoundUrl(newUrl);

        if (newUrl !== currentUrl) {
          navigate(newUrl, { replace: true });
        }

        return;
      }

      if (event.data?.type !== "extension-navigate" || !identifier) return;

      setExtensionRouteNotFoundUrl(null);
      isIframeNavigatingRef.current = true;
      const path = toAppSubPath(identifier, event.data.path ?? "");
      const search = event.data.search ?? "";
      const hash = event.data.hash ?? "";
      const newUrl = `/apps/${identifier}${path}${search}${hash}`;

      if (newUrl !== currentUrl) {
        navigate(newUrl, { replace: true });
      }

      requestAnimationFrame(() => {
        isIframeNavigatingRef.current = false;
      });
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currentUrl, identifier, navigate]);

  useEffect(() => {
    setExtensionRouteNotFoundUrl(null);
  }, [identifier, iframeSrc]);

  // Handle browser back/forward (parent → iframe sync)
  useEffect(() => {
    if (isIframeNavigatingRef.current || !identifier) return;

    const subPath = wildcard ? `/${wildcard}` : "/";
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "parent-navigate",
        path: subPath,
        search: location.search,
        hash: location.hash,
      },
      "*",
    );
  }, [identifier, wildcard, location.search, location.hash]);

  if (isExtensionLoadError) {
    if (isNotFoundError(extensionLoadError)) {
      return <NotFoundPage />;
    }

    throw extensionLoadError;
  }

  if (extensionRouteNotFoundUrl === currentUrl) {
    return <NotFoundPage />;
  }

  if (isExtensionLoading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <Loader className="size-10" />
      </div>
    );
  }

  return (
    <iframe
      key={identifier}
      ref={iframeRef}
      src={iframeSrc}
      className="h-dvh w-full border-0"
      title={identifier}
      allow="clipboard-read; clipboard-write"
    />
  );
}
