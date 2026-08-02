import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@buildingai/ui/components/ai-elements/reasoning";
import { Task, TaskContent, TaskTrigger } from "@buildingai/ui/components/ai-elements/task";
import type { UIMessage } from "ai";
import { BrainIcon, CheckCircleIcon, ChevronDownIcon } from "lucide-react";
import { memo } from "react";

import { partitionReasoningPartsForDisplay } from "../../libs/reasoning-streaming";

export interface MessageReasoningProps {
  messageId: string;
  parts: UIMessage["parts"];
  isStreaming: boolean;
}

export const MessageReasoning = memo(function MessageReasoning({
  messageId,
  parts,
  isStreaming,
}: MessageReasoningProps) {
  const { completed, active, shouldCollapseCompleted } = partitionReasoningPartsForDisplay(
    parts,
    isStreaming,
  );

  if (completed.length === 0 && active.length === 0) {
    return null;
  }

  const completedNodes = completed.map(({ part, reasoningIndex }) => (
    <Reasoning
      key={`${messageId}-reasoning-${reasoningIndex}`}
      defaultOpen={false}
      isStreaming={false}
    >
      <ReasoningTrigger />
      <ReasoningContent>{part.text || ""}</ReasoningContent>
    </Reasoning>
  ));

  const activeNodes = active.map(({ part, reasoningIndex }) => (
    <Reasoning key={`${messageId}-reasoning-${reasoningIndex}`} defaultOpen isStreaming>
      <ReasoningTrigger />
      <ReasoningContent>{part.text || ""}</ReasoningContent>
    </Reasoning>
  ));

  return (
    <>
      {shouldCollapseCompleted ? (
        <Task className="mb-2" defaultOpen={false}>
          <TaskTrigger title={`已完成 ${completed.length} 个思考过程`}>
            <div className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center gap-2 text-sm transition-colors">
              <BrainIcon className="size-4" />
              <CheckCircleIcon className="size-4 text-green-600" />
              <p className="text-sm">已完成 {completed.length} 个思考过程</p>
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
