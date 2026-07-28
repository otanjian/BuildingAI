import { useAuthStore } from "@buildingai/stores";
import { WebPreview, WebPreviewBody } from "@buildingai/ui/components/ai-elements/web-preview";
import { Button } from "@buildingai/ui/components/ui/button";
import { ExternalLink } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { getApiBaseUrl } from "@/utils/api";

import {
  buildArtifactAuthHeaders,
  extractHtmlArtifacts,
  openHtmlArtifactBlobInNewTab,
  readAnonymousIdentifierFromStorage,
  resolveArtifactFetchUrl,
  type HtmlArtifactData,
} from "./artifact-preview";

export type { HtmlArtifactData };

type MessageArtifactsProps = {
  parts?: Array<{ type?: string; data?: unknown }>;
};

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; blobUrl: string }
  | { status: "error"; message: string };

function useAuthenticatedArtifactBlob(apiUrl: string | undefined): PreviewState {
  const sessionToken = useAuthStore((state) => state.auth.token);
  const [state, setState] = useState<PreviewState>({ status: "idle" });
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
            // keep status-based message
          }
          throw new Error(detail);
        }
        const blob = await response.blob();
        // Never render API JSON/error payloads as HTML even if status was wrong.
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

const HtmlArtifactPreview = memo(function HtmlArtifactPreview({
  artifact,
}: {
  artifact: HtmlArtifactData;
}) {
  const preview = useAuthenticatedArtifactBlob(artifact.url);
  const iframeSrc = preview.status === "ready" ? preview.blobUrl : undefined;

  const handleOpenReport = () => {
    if (preview.status !== "ready") return;
    openHtmlArtifactBlobInNewTab(preview.blobUrl);
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border">
      <WebPreview defaultUrl="" className="h-[420px] rounded-none border-0">
        {preview.status === "loading" || preview.status === "idle" ? (
          <div className="text-muted-foreground flex min-h-[360px] items-center justify-center text-sm">
            Loading preview…
          </div>
        ) : preview.status === "error" ? (
          <div className="text-destructive flex min-h-[360px] items-center justify-center px-4 text-center text-sm">
            {preview.message}
          </div>
        ) : iframeSrc ? (
          <WebPreviewBody src={iframeSrc} className="min-h-[360px] bg-white" />
        ) : null}
      </WebPreview>
      <div className="flex items-center justify-between gap-2 border-t px-3 py-1.5">
        <div className="text-muted-foreground min-w-0 truncate text-xs">
          {artifact.title || artifact.relativePath || "HTML preview"}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2 text-xs"
          disabled={preview.status !== "ready"}
          onClick={handleOpenReport}
        >
          <ExternalLink className="size-3.5" />
          打开报告
        </Button>
      </div>
    </div>
  );
});

export const MessageArtifacts = memo(function MessageArtifacts({ parts }: MessageArtifactsProps) {
  const artifacts = useMemo(() => extractHtmlArtifacts(parts), [parts]);
  if (artifacts.length === 0) return null;

  return (
    <div className="mt-3 flex w-full flex-col gap-3">
      {artifacts.map((artifact) => (
        <HtmlArtifactPreview key={artifact.url} artifact={artifact} />
      ))}
    </div>
  );
});
