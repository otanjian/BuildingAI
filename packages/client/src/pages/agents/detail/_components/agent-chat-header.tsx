import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Button } from "@buildingai/ui/components/ui/button";
import { SheetTrigger } from "@buildingai/ui/components/ui/sheet";
import { cn } from "@buildingai/ui/lib/utils";
import { Bot, ChevronLeft, PanelLeft } from "lucide-react";
import type { ReactNode } from "react";

type AgentChatHeaderProps = {
  avatar?: string | null;
  name?: string | null;
  panelExpanded: boolean;
  onTogglePanel: () => void;
  onBack: () => void;
  children?: ReactNode;
  className?: string;
};

export function AgentChatHeader({
  avatar,
  name,
  panelExpanded,
  onTogglePanel,
  onBack,
  children,
  className,
}: AgentChatHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between gap-2 px-3 pt-3",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 md:hidden"
            aria-label="打开菜单"
          >
            <PanelLeft className="size-4" />
          </Button>
        </SheetTrigger>
        <Button
          size="icon"
          variant="ghost"
          className="hidden md:inline-flex"
          title={panelExpanded ? "收起侧栏" : "展开侧栏"}
          aria-label={panelExpanded ? "收起侧栏" : "展开侧栏"}
          onClick={onTogglePanel}
        >
          <PanelLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="返回智能体列表" onClick={onBack}>
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-2">
          <Avatar className="size-8 rounded-lg after:rounded-lg">
            <AvatarImage className="rounded-lg" src={avatar ?? undefined} alt={name ?? ""} />
            <AvatarFallback className="rounded-lg">
              <Bot className="size-4" />
            </AvatarFallback>
          </Avatar>
          <span className={panelExpanded ? "md:opacity-0" : "opacity-100 transition"}>{name}</span>
        </div>
      </div>
      <div className="flex items-center gap-0.5">{children}</div>
    </header>
  );
}
