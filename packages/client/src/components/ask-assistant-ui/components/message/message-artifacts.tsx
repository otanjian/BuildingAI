import { WebPreview, WebPreviewBody } from "@buildingai/ui/components/ai-elements/web-preview";
import { Button } from "@buildingai/ui/components/ui/button";
import { ExternalLink } from "lucide-react";
import { memo, useMemo } from "react";

import {
  extractHtmlArtifacts,
  type HtmlArtifactData,
  openHtmlArtifactBlobInNewTab,
} from "./artifact-preview";
import { useAuthenticatedArtifactBlob } from "./use-authenticated-artifact-blob";

export type { HtmlArtifactData };

type MessageArtifactsProps = {
  parts?: Array<{ type?: string; data?: unknown }>;
};

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
