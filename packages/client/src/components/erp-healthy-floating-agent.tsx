import { Button } from "@buildingai/ui/components/ui/button";
import { cn } from "@buildingai/ui/lib/utils";
import { Bot, X } from "lucide-react";
import { useMemo, useState } from "react";

/** Published agent embed for ERP data governance dashboard. */
const AGENT_ID = "cf98a37e-26dc-42d2-98a4-513f3ac86056";
const ACCESS_TOKEN =
  "35d31dab18d1b8655dbdd2c6d7280483fbc2a5e287930d3e08a9abc01e4da7be";

/**
 * Desktop floating agent chat on /apps/erp-healthy (parent shell — extension CSS does not apply here).
 */
export function ErpHealthyFloatingAgent() {
  const [open, setOpen] = useState(false);
  const embedSrc = useMemo(
    () =>
      `${window.location.origin}/agents/${AGENT_ID}/${encodeURIComponent(ACCESS_TOKEN)}`,
    [],
  );

  return (
    <>
      {open ? (
        <iframe
          src={embedSrc}
          title="ERP governance agent"
          allow="clipboard-write; microphone; camera"
          className={cn(
            "fixed z-[2147483000] border-0 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]",
            "right-6 bottom-[4.5rem] h-[min(720px,calc(100vh-6rem))] w-[min(420px,calc(100vw-32px))] max-w-[calc(100vw-32px)] rounded-[20px]",
          )}
        />
      ) : null}
      <Button
        type="button"
        size="icon"
        aria-label={open ? "关闭 AI 助手" : "打开 AI 助手"}
        aria-expanded={open}
        data-testid="erp-healthy-floating-agent-fab"
        className={cn(
          "fixed right-6 bottom-6 z-[2147483001] size-14 rounded-full shadow-lg",
          "bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500",
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </Button>
    </>
  );
}
