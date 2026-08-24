import { useAuthStore } from "@buildingai/stores";
import { useEffect, useMemo, useRef, useState } from "react";

import { getApiBaseUrl } from "@/utils/api";

import {
  buildArtifactAuthHeaders,
  readAnonymousIdentifierFromStorage,
  resolveArtifactFetchUrl,
} from "./artifact-preview";

export type ArtifactPreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; blobUrl: string }
  | { status: "error"; message: string };

export function useAuthenticatedArtifactBlob(apiUrl: string | undefined): ArtifactPreviewState {
  const sessionToken = useAuthStore((state) => state.auth.token);
  const [state, setState] = useState<ArtifactPreviewState>({ status: "idle" });
  const blobUrlRef = useRef<string | undefined>(undefined);

  const pathname =
    typeof window !== "undefined" && typeof window.location?.pathname === "string"
      ? window.location.pathname
      : "";

  const authorization = useMemo(() => {
    return buildArtifactAuthHeaders({
      sessionToken,
      pathname,
      anonymousIdentifier: readAnonymousIdentifierFromStorage(),
    }).Authorization;
  }, [sessionToken, pathname]);

  const anonymousIdentifier = useMemo(() => readAnonymousIdentifierFromStorage(), []);

  useEffect(() => {
    const revokeCurrent = () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = undefined;
      }
    };

    if (!apiUrl) {
      revokeCurrent();
      setState({ status: "idle" });
      return;
    }

    if (!authorization) {
      revokeCurrent();
      setState({ status: "error", message: "Missing authentication for HTML preview" });
      return;
    }

    const fetchUrl = resolveArtifactFetchUrl(apiUrl, getApiBaseUrl());
    const controller = new AbortController();
    let cancelled = false;

    revokeCurrent();
    setState({ status: "loading" });

    void (async () => {
      try {
        const headers: Record<string, string> = { Authorization: authorization };
        if (anonymousIdentifier) {
          headers["X-Anonymous-Identifier"] = anonymousIdentifier;
        }
        const response = await fetch(fetchUrl, {
          method: "GET",
          headers,
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (!response.ok) {
          let detail = `Failed to load preview (${response.status})`;
          try {
            const body = (await response.json()) as { message?: string };
            if (body?.message) detail = body.message;
          } catch {
            // Keep the status-based message when the response is not JSON.
          }
          throw new Error(detail);
        }
        const blob = await response.blob();
        const type = (blob.type || "").toLowerCase();
        if (type.includes("json")) {
          throw new Error("Preview response was not HTML");
        }
        const htmlBlob = type.includes("html")
          ? blob
          : new Blob([blob], { type: "text/html; charset=utf-8" });
        const objectUrl = URL.createObjectURL(htmlBlob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        blobUrlRef.current = objectUrl;
        setState({ status: "ready", blobUrl: objectUrl });
      } catch (error) {
        if (controller.signal.aborted || cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load HTML preview";
        setState({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      revokeCurrent();
    };
  }, [apiUrl, authorization, anonymousIdentifier]);

  return state;
}
