import { Task, TaskContent, TaskTrigger } from "@buildingai/ui/components/ai-elements/task";
import type { UIMessage } from "ai";
import { CheckCircleIcon, ChevronDownIcon, WrenchIcon } from "lucide-react";
import { memo, type ReactNode } from "react";

import { useOptionalAssistantContext } from "../../context";
import { GenericTool } from "../tools/generic-tool";
import { ImageGenerationTool } from "../tools/image-generation-tool";
import { KnowledgeReferences } from "../tools/knowledge-references";
import { PlanTool } from "../tools/plan-tool";
import { DelegatedAgentTool } from "../tools/delegated-agent-tool";
import { WeatherTool } from "../tools/weather-tool";
import {
  isInteractiveQuestionToolPart,
  partitionToolPartsForDisplay,
} from "./message-tools-helpers";

interface ToolPartData {
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  approval?: { id?: string; approved?: boolean };
}

export interface MessageToolsProps {
  parts: UIMessage["parts"];
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

type ToolUIPart = UIMessage["parts"][number] & ToolPartData;

function renderToolPart(
  part: ToolUIPart,
  index: number,
  options: {
    showReference: boolean;
    showMcpToolDetails: boolean;
    parts: UIMessage["parts"];
    addToolApprovalResponse?: MessageToolsProps["addToolApprovalResponse"];
  },
): ReactNode {
  const { showReference, showMcpToolDetails, parts, addToolApprovalResponse } = options;
  const toolPart = part as unknown as ToolPartData;
  const key = toolPart.toolCallId || `tool-${index}`;

  if (part.type === "tool-datasetsSearch") {
    if (!showReference) return null;
    const output = toolPart.output as { found?: boolean; results?: unknown[] } | undefined;
    if (output?.found && Array.isArray(output.results) && output.results.length > 0) {
      return <KnowledgeReferences key={key} toolPart={{ output: output.results }} />;
    }
    return null;
  }

  if (part.type === "tool-getInformation") {
    if (!showReference) return null;
    const output = toolPart.output;
    if (Array.isArray(output) && output.length > 0) {
      return <KnowledgeReferences key={key} toolPart={toolPart} />;
    }
    return null;
  }

  if ("output" in toolPart && Array.isArray(toolPart.output) && toolPart.output.length > 0) {
    return null;
  }

  if (part.type === "tool-getWeather") {
    return (
      <WeatherTool
        key={key}
        toolPart={toolPart}
        addToolApprovalResponse={addToolApprovalResponse}
      />
    );
  }

  if (part.type === "tool-request_execution_plan") {
    const planningParts = parts.filter(
      (p) =>
        p &&
        typeof p === "object" &&
        "type" in p &&
        (p as { type: string }).type === "data-planning-status",
    ) as Array<{ type: string; data?: { phase?: string; planPreview?: string } }>;
    const planningStatus =
      planningParts.length > 0 ? planningParts[planningParts.length - 1].data : undefined;
    return (
      <PlanTool
        key={key}
        toolPart={toolPart}
        planningStatus={
          planningStatus
            ? { phase: planningStatus.phase ?? "", planPreview: planningStatus.planPreview }
            : undefined
        }
      />
    );
  }

  if (
    part.type === "tool-dalle2ImageGeneration" ||
    part.type === "tool-dalle3ImageGeneration" ||
    part.type === "tool-gptImageGeneration"
  ) {
    return (
      <ImageGenerationTool
        key={key}
        toolPart={toolPart}
        addToolApprovalResponse={addToolApprovalResponse}
      />
    );
  }

  const isDelegatedAgent =
    part.type === "tool-invoke_agent" ||
    (part.type === "dynamic-tool" &&
      (part as unknown as { toolName?: string }).toolName === "invoke_agent");
  if (isDelegatedAgent) {
    return <DelegatedAgentTool key={key} toolPart={toolPart} />;
  }

  const toolName =
    part.type === "dynamic-tool"
      ? ((part as unknown as { toolName?: string }).toolName ?? "tool")
      : (part.type as string).replace("tool-", "");
  return (
    <GenericTool
      key={key}
      toolName={toolName}
      toolPart={toolPart}
      showDetails={showMcpToolDetails}
    />
  );
}

export const MessageTools = memo(function MessageTools({
  parts,
  addToolApprovalResponse,
}: MessageToolsProps) {
  const ctx = useOptionalAssistantContext();
  const showReference = ctx?.showReference ?? true;
  const showMcpToolDetails = ctx?.showMcpToolDetails ?? true;
  const toolParts = parts.filter(
    (part) =>
      typeof part.type === "string" &&
      (part.type.startsWith("tool-") || part.type === "dynamic-tool") &&
      !isInteractiveQuestionToolPart(part as ToolPartData),
  ) as ToolUIPart[];

  if (toolParts.length === 0) return null;

  const { completed, active, shouldCollapseCompleted } = partitionToolPartsForDisplay(toolParts);
  const renderOptions = {
    showReference,
    showMcpToolDetails,
    parts,
    addToolApprovalResponse,
  };

  const completedNodes = completed
    .map((part, index) => renderToolPart(part, index, renderOptions))
    .filter(Boolean);
  const activeNodes = active
    .map((part, index) => renderToolPart(part, index + completed.length, renderOptions))
    .filter(Boolean);

  return (
    <>
      {shouldCollapseCompleted && completedNodes.length > 0 ? (
        <Task className="mb-2" defaultOpen={false}>
          <TaskTrigger title={`已完成 ${completedNodes.length} 个工具调用`}>
            <div className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-2 text-sm transition-colors">
              <WrenchIcon className="size-4" />
              <CheckCircleIcon className="size-4 text-green-600" />
              <p className="text-sm">已完成 {completedNodes.length} 个工具调用</p>
              <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </TaskTrigger>
          <TaskContent>
            <div className="space-y-2">{completedNodes}</div>
          </TaskContent>
        </Task>
      ) : (
        completedNodes
      )}
      {activeNodes}
    </>
  );
});
