import { Button } from "@buildingai/ui/components/ui/button";
import { AlertTriangle, FileChartColumn, Loader2, RotateCw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";

import { useAuthenticatedArtifactBlob } from "@/components/ask-assistant-ui/components/message/use-authenticated-artifact-blob";

import { buildConversationArtifactApiPath, normalizeReportRelativePath } from "./report-route";

export default function AgentReportPage() {
  const params = useParams<{ id: string; uuid: string; "*": string }>();
  const relativePath = useMemo(() => normalizeReportRelativePath(params["*"]), [params]);
  const apiPath = useMemo(
    () =>
      params.id && params.uuid && relativePath
        ? buildConversationArtifactApiPath({
            agentId: params.id,
            conversationId: params.uuid,
            relativePath,
          })
        : undefined,
    [params.id, params.uuid, relativePath],
  );
  const preview = useAuthenticatedArtifactBlob(apiPath);

  useEffect(() => {
    if (!relativePath) return;
    document.title = `${relativePath.split("/").at(-1)} - Bowi AI`;
  }, [relativePath]);

  const invalidPath = !relativePath || !apiPath;

  return (
    <main className="bg-background flex h-dvh min-h-[480px] w-full flex-col overflow-hidden">
      <header className="bg-background/95 flex h-12 shrink-0 items-center gap-3 border-b px-4 backdrop-blur">
        <div className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
          <FileChartColumn className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium">Bowi AI 报告</div>
          <div className="text-muted-foreground truncate text-[11px]">
            {relativePath || "无效报告路径"}
          </div>
        </div>
      </header>

      <section className="relative min-h-0 flex-1 bg-white">
        {invalidPath ? (
          <ReportFailure message="报告地址无效，只能打开当前会话中的 HTML 报告。" />
        ) : preview.status === "loading" || preview.status === "idle" ? (
          <div className="text-muted-foreground absolute inset-0 flex items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> 正在加载报告…
          </div>
        ) : preview.status === "error" ? (
          <ReportFailure message={preview.message} />
        ) : (
          <iframe
            title={relativePath}
            src={preview.blobUrl}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
          />
        )}
      </section>
    </main>
  );
}

function ReportFailure({ message }: { message: string }) {
  return (
    <div className="bg-background absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="bg-destructive/10 text-destructive flex size-10 items-center justify-center rounded-full">
        <AlertTriangle className="size-5" />
      </div>
      <div>
        <h1 className="text-sm font-semibold">报告无法打开</h1>
        <p className="text-muted-foreground mt-1 max-w-xl text-xs">{message}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
        <RotateCw className="mr-1.5 size-3.5" /> 重新加载
      </Button>
    </div>
  );
}
