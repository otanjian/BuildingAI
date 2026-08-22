import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { shouldCommitConversationRename } from "@buildingai/ui/lib/conversation-rename";
import { cn } from "@buildingai/ui/lib/utils";
import { Archive, LoaderCircle, PenLine } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type AgentHistoryConversationRowProps = {
  title: string;
  isSelected: boolean;
  isGenerating?: boolean;
  isArchiving?: boolean;
  onSelect: () => void;
  onRename: (title: string) => Promise<void>;
  onArchive: () => Promise<void> | void;
  onIntent?: () => void;
};

/**
 * Agent history row with hover rename + archive icon actions.
 */
export function AgentHistoryConversationRow({
  title,
  isSelected,
  isGenerating,
  isArchiving,
  onSelect,
  onRename,
  onArchive,
  onIntent,
}: AgentHistoryConversationRowProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const [isRenaming, setIsRenaming] = useState(false);

  const [prevTitle, setPrevTitle] = useState(title);
  if (prevTitle !== title) {
    setPrevTitle(title);
    setRenameValue(title);
  }

  const handleOpenRename = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setRenameValue(title);
      setRenameDialogOpen(true);
    },
    [title],
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setRenameDialogOpen(open);
      if (!open) {
        setRenameValue(title);
      }
    },
    [title],
  );

  const handleRenameConfirm = useCallback(async () => {
    if (!shouldCommitConversationRename(title, renameValue)) {
      setRenameDialogOpen(false);
      return;
    }
    setIsRenaming(true);
    try {
      await onRename(renameValue.trim());
      setRenameDialogOpen(false);
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "重命名失败，请稍后重试";
      toast.error(message);
    } finally {
      setIsRenaming(false);
    }
  }, [onRename, renameValue, title]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleRenameConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setRenameDialogOpen(false);
        setRenameValue(title);
      }
    },
    [handleRenameConfirm, title],
  );

  const handleArchiveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void onArchive();
    },
    [onArchive],
  );

  return (
    <>
      <div className="group relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-current={isSelected ? "true" : undefined}
          className={cn(
            "w-full min-w-0 justify-start rounded-sm px-2 pr-14",
            "hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10",
            isSelected && "bg-muted-foreground/10 dark:bg-muted-foreground/10 font-medium",
          )}
          title={title}
          onClick={onSelect}
          onMouseEnter={onIntent}
          onFocus={onIntent}
        >
          <span className="min-w-0 flex-1 truncate text-left">{title}</span>
          {isGenerating ? (
            <LoaderCircle className="text-muted-foreground size-3.5 shrink-0 animate-spin" />
          ) : null}
        </Button>
        <div
          className={cn(
            "absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-0.5",
            "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
            isArchiving && "opacity-100",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="重命名"
            aria-label={`重命名 ${title}`}
            disabled={isArchiving || isRenaming}
            className="text-muted-foreground size-6 rounded-sm"
            onClick={handleOpenRename}
          >
            <PenLine className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="归档"
            aria-label={`归档 ${title}`}
            disabled={isArchiving}
            className="text-muted-foreground size-6 rounded-sm"
            onClick={handleArchiveClick}
          >
            {isArchiving ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Archive className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名对话</DialogTitle>
            <DialogDescription>请输入新的对话名称</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="对话名称"
              autoFocus
              disabled={isRenaming}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              取消
            </Button>
            <Button
              onClick={() => void handleRenameConfirm()}
              disabled={!renameValue.trim() || isRenaming}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
