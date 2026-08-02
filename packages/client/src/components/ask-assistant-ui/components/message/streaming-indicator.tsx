import { cn } from "@buildingai/ui/lib/utils";
import { memo } from "react";

type StreamingIndicatorProps = {
  className?: string;
};

/** Compact animated cue shown while an assistant turn is still in progress. */
export const StreamingIndicator = memo(function StreamingIndicator({
  className,
}: StreamingIndicatorProps) {
  return (
    <div
      className={cn("text-muted-foreground flex items-center gap-2 px-1 py-2 text-sm", className)}
      role="status"
      aria-live="polite"
      aria-label="正在处理"
    >
      <span className="bg-foreground size-1.5 shrink-0 animate-pulse rounded-full" aria-hidden />
      <span className="animate-pulse">正在处理...</span>
    </div>
  );
});
