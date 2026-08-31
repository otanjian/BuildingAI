"use client";

import { useI18n } from "@buildingai/i18n";
import {
  type AgentMemoryInput,
  type AgentMemoryItem,
  useAccessibleMemoryAgentsQuery,
  useAgentMemoriesQuery,
  useClearAgentMemoriesMutation,
  useCreateAgentMemoryMutation,
  useDeactivateAgentMemoryMutation,
  useUpdateAgentMemoryMutation,
} from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { cn } from "@buildingai/ui/lib/utils";
import { Maximize2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SettingItemGroup } from "../setting-item";

export default function LongTermMemorySetting() {
  const { t } = useI18n();
  const { confirm } = useAlertDialog();
  const { data: memories = [], isLoading } = useAgentMemoriesQuery();
  const { data: agents = [] } = useAccessibleMemoryAgentsQuery();
  const create = useCreateAgentMemoryMutation();
  const update = useUpdateAgentMemoryMutation();
  const remove = useDeactivateAgentMemoryMutation();
  const clear = useClearAgentMemoriesMutation();
  const [editing, setEditing] = useState<AgentMemoryItem | null | "new">(null);
  const [agentId, setAgentId] = useState("");
  const [content, setContent] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const openForm = (item?: AgentMemoryItem) => {
    setEditing(item ?? "new");
    setAgentId(item?.agentId ?? "");
    setContent(item?.content ?? "");
    setIsFullscreen(false);
  };
  const closeForm = () => {
    if (!create.isPending && !update.isPending) {
      setEditing(null);
      setIsFullscreen(false);
    }
  };
  const submit = () => {
    const value = content.trim();
    if (!agentId) {
      toast.error(t("settings.longTermMemory.agentRequired"));
      return;
    }
    if (!value) {
      toast.error(t("settings.longTermMemory.required"));
      return;
    }
    const input: AgentMemoryInput = { agentId, content: value };
    const action =
      editing === "new"
        ? create.mutateAsync(input)
        : update.mutateAsync({ id: (editing as AgentMemoryItem).id, ...input });
    void action
      .then(() => {
        toast.success(t("settings.longTermMemory.saved"));
        closeForm();
      })
      .catch((error: Error) => toast.error(error.message));
  };
  const deleteOne = async (item: AgentMemoryItem) => {
    try {
      await confirm({
        title: t("settings.longTermMemory.delete"),
        description: t("settings.longTermMemory.confirmDelete"),
        confirmVariant: "destructive",
      });
    } catch {
      return;
    }
    remove.mutate(item.id, {
      onSuccess: () => toast.success(t("settings.longTermMemory.deleted")),
      onError: (error) => toast.error(error.message),
    });
  };
  const clearAll = async () => {
    if (!memories.length) return;
    try {
      await confirm({
        title: t("settings.longTermMemory.clear"),
        description: t("settings.longTermMemory.confirmClear"),
        confirmVariant: "destructive",
      });
    } catch {
      return;
    }
    clear.mutate(undefined, {
      onSuccess: () => toast.success(t("settings.longTermMemory.cleared")),
      onError: (error) => toast.error(error.message),
    });
  };

  const agentOptions =
    editing !== "new" && editing && !agents.some((agent) => agent.id === agentId)
      ? [{ id: editing.agentId, name: editing.agentName }, ...agents]
      : agents;

  return (
    <div className="flex flex-col gap-4">
      <SettingItemGroup label={t("settings.longTermMemory.title")}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="text-muted-foreground max-w-2xl text-sm">
            {t("settings.longTermMemory.description")}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => openForm()} disabled={!agents.length}>
              <Plus className="mr-1 size-4" />
              {t("settings.longTermMemory.add")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void clearAll()}
              disabled={clear.isPending || !memories.length}
            >
              {t("settings.longTermMemory.clear")}
            </Button>
          </div>
        </div>
        <div className="px-4 pb-3">
          <p className="text-muted-foreground bg-muted/30 rounded-md p-3 text-xs">
            {t("settings.longTermMemory.privacy")}
          </p>
        </div>
        <div className="px-4 pb-4">
          {isLoading && (
            <p className="text-muted-foreground py-10 text-center text-sm">
              {t("settings.longTermMemory.loading")}
            </p>
          )}
          {!isLoading && !memories.length && (
            <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
              <p className="text-sm">{t("settings.longTermMemory.empty")}</p>
              <p className="mt-1 text-xs">{t("settings.longTermMemory.emptyHint")}</p>
            </div>
          )}
          {!isLoading && memories.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <div className="text-muted-foreground bg-muted/20 hidden grid-cols-[minmax(140px,0.35fr)_minmax(0,1fr)_auto] gap-4 border-b px-4 py-2 text-xs font-medium sm:grid">
                <span>{t("settings.longTermMemory.agent")}</span>
                <span>{t("settings.longTermMemory.content")}</span>
                <span className="sr-only">{t("settings.longTermMemory.actions")}</span>
              </div>
              {memories.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(140px,0.35fr)_minmax(0,1fr)_auto] sm:items-start sm:gap-4"
                >
                  <div className="min-w-0">
                    <span className="text-muted-foreground mr-2 text-xs sm:hidden">
                      {t("settings.longTermMemory.agent")}
                    </span>
                    <span className="text-sm font-medium break-words">
                      {item.agentName || item.agentId}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-muted-foreground mr-2 text-xs sm:hidden">
                      {t("settings.longTermMemory.content")}
                    </span>
                    <span className="text-sm break-words whitespace-pre-wrap">{item.content}</span>
                  </div>
                  <div className="flex shrink-0 gap-1 sm:justify-self-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("settings.longTermMemory.editAction")}
                      onClick={() => openForm(item)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("settings.longTermMemory.delete")}
                      onClick={() => void deleteOne(item)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingItemGroup>
      <Dialog open={editing !== null} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "sm:max-w-[560px]",
            isFullscreen && "h-screen max-h-screen w-screen max-w-none rounded-none p-6",
          )}
        >
          <DialogHeader className="flex-row items-center justify-between pr-8 text-left">
            <DialogTitle>
              {editing === "new"
                ? t("settings.longTermMemory.add")
                : t("settings.longTermMemory.edit")}
            </DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("settings.longTermMemory.close")}
                onClick={closeForm}
              >
                <X className="size-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className={cn("flex min-h-0 flex-col gap-4", isFullscreen && "h-full")}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="memory-agent">
                {t("settings.longTermMemory.agent")}
              </label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger
                  id="memory-agent"
                  className="w-full"
                  aria-label={t("settings.longTermMemory.agent")}
                >
                  <SelectValue placeholder={t("settings.longTermMemory.agentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {agentOptions.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!agentOptions.length && (
                <p className="text-muted-foreground text-xs">
                  {t("settings.longTermMemory.agentUnavailable")}
                </p>
              )}
            </div>
            <div
              className={cn("flex min-h-0 flex-1 flex-col gap-2", !isFullscreen && "sm:min-h-40")}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium" htmlFor="memory-content">
                  {t("settings.longTermMemory.content")}
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFullscreen((value) => !value)}
                >
                  <Maximize2 className="mr-1 size-4" />
                  {isFullscreen
                    ? t("settings.longTermMemory.exitFullscreen")
                    : t("settings.longTermMemory.fullscreen")}
                </Button>
              </div>
              <Textarea
                id="memory-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={1000}
                placeholder={t("settings.longTermMemory.contentPlaceholder")}
                aria-label={t("settings.longTermMemory.content")}
                className={cn("min-h-40 resize-y", isFullscreen && "h-full resize-none")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              {t("settings.longTermMemory.cancel")}
            </Button>
            <Button
              onClick={submit}
              disabled={create.isPending || update.isPending || !agentOptions.length}
            >
              {t("settings.longTermMemory.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
