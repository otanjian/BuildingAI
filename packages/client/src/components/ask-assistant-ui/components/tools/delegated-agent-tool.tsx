import { Bot, CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { memo } from "react";

type ToolPart = {
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
};

export const DelegatedAgentTool = memo(function DelegatedAgentTool({
  toolPart,
}: {
  toolPart: ToolPart;
}) {
  const input = toolPart.input ?? {};
  const output = toolPart.output as { status?: string; agentName?: string; answer?: string; message?: string } | undefined;
  const failed = toolPart.state === "output-error" || output?.status === "failed" || !!toolPart.errorText;
  const running = !failed && !output && toolPart.state !== "output-available";
  const title = output?.agentName || String(input.agentId || "子智能体");
  return (
    <div className="bg-secondary/60 mb-2 rounded-lg border px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <Bot className="size-4" />
        <span className="font-medium">调用 Direct 智能体：{title}</span>
        {running ? <Loader2 className="text-muted-foreground size-4 animate-spin" /> : failed ? <CircleAlert className="text-destructive size-4" /> : <CheckCircle2 className="text-emerald-600 size-4" />}
        <span className="text-muted-foreground text-xs">{running ? "执行中" : failed ? "失败" : "已完成"}</span>
      </div>
      {output?.answer && <p className="text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap text-xs">{output.answer}</p>}
      {(toolPart.errorText || output?.message) && <p className="text-destructive mt-1 text-xs">{toolPart.errorText || output?.message}</p>}
    </div>
  );
});
