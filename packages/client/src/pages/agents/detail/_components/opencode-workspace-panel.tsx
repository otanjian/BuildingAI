import {
  type OpencodeWorkspaceEntry,
  useOpencodeWorkspaceFileContentQuery,
  useOpencodeWorkspaceFilesQuery,
} from "@buildingai/services/web";
import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@buildingai/ui/components/ai-elements/file-tree";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@buildingai/ui/components/ui/context-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@buildingai/ui/components/ui/resizable";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { cn } from "@buildingai/ui/lib/utils";
import { normalizeWorkspaceRelativePath } from "@buildingai/ui/lib/workspace-relative-path";
import { Copy, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { toast } from "sonner";

type OpencodeWorkspacePanelProps = {
  agentId: string;
  className?: string;
};

async function copyRelativePath(path: string) {
  const relative = normalizeWorkspaceRelativePath(path);
  await navigator.clipboard.writeText(relative);
  toast.success("已复制相对路径", { description: relative });
}

function CopyPathControl({ path, className }: { path: string; className?: string }) {
  const onActivate = useCallback(
    (event: MouseEvent | KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      void copyRelativePath(path);
    },
    [path],
  );

  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100",
        className,
      )}
      title="复制相对路径"
      aria-label="复制相对路径"
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onActivate(event);
      }}
    >
      <Copy className="size-3" />
    </span>
  );
}

function DirectoryListing({
  agentId,
  dirPath,
  enabled,
  expandedPaths,
  onEntries,
}: {
  agentId: string;
  dirPath: string;
  enabled: boolean;
  expandedPaths: Set<string>;
  onEntries: (entries: OpencodeWorkspaceEntry[]) => void;
}) {
  const { data, isLoading, isError, error } = useOpencodeWorkspaceFilesQuery(agentId, dirPath, {
    enabled,
  });

  useEffect(() => {
    if (data?.entries) onEntries(data.entries);
  }, [data?.entries, onEntries]);

  if (!enabled) return null;

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-2 py-1 text-xs">
        <Loader2 className="size-3 animate-spin" />
        Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive px-2 py-1 text-xs">
        {(error as Error)?.message || "Failed to load directory"}
      </p>
    );
  }

  const entries = data?.entries ?? [];
  if (entries.length === 0) {
    return <p className="text-muted-foreground px-2 py-1 text-xs">Empty</p>;
  }

  return (
    <>
      {entries.map((entry) => (
        <ContextMenu key={entry.path}>
          <ContextMenuTrigger asChild>
            <div className="group/row">
              {entry.type === "directory" ? (
                <FileTreeFolder
                  path={entry.path}
                  name={entry.name}
                  actions={<CopyPathControl path={entry.path} />}
                >
                  <DirectoryListing
                    agentId={agentId}
                    dirPath={entry.path}
                    enabled={expandedPaths.has(entry.path)}
                    expandedPaths={expandedPaths}
                    onEntries={onEntries}
                  />
                </FileTreeFolder>
              ) : (
                <FileTreeFile
                  path={entry.path}
                  name={entry.name}
                  actions={<CopyPathControl path={entry.path} />}
                />
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onSelect={() => {
                void copyRelativePath(entry.path);
              }}
            >
              复制相对路径
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </>
  );
}

export function OpencodeWorkspacePanel({ agentId, className }: OpencodeWorkspacePanelProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [selectedIsFile, setSelectedIsFile] = useState(false);
  const [entryTypes, setEntryTypes] = useState<Map<string, OpencodeWorkspaceEntry["type"]>>(
    () => new Map(),
  );

  const registerEntries = useCallback((entries: OpencodeWorkspaceEntry[]) => {
    setEntryTypes((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const entry of entries) {
        if (next.get(entry.path) !== entry.type) {
          next.set(entry.path, entry.type);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const contentQuery = useOpencodeWorkspaceFileContentQuery(
    agentId,
    selectedIsFile && selectedPath ? selectedPath : null,
  );

  const handleSelect = useCallback(
    (path: string) => {
      const type = entryTypes.get(path);
      if (type !== "file") {
        setExpandedPaths((prev) => {
          const next = new Set(prev);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
        setSelectedPath(path);
        setSelectedIsFile(false);
        return;
      }
      setSelectedPath(path);
      setSelectedIsFile(true);
    },
    [entryTypes],
  );

  const previewPath = selectedIsFile ? selectedPath : undefined;

  return (
    <aside className={cn("bg-background flex h-full min-h-0 w-full flex-col", className)}>
      <div className="border-border flex h-10 shrink-0 items-center border-b px-3">
        <span className="text-sm font-medium">Workspace</span>
      </div>
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="opencode-workspace-inner"
        className="min-h-0 flex-1"
      >
        <ResizablePanel defaultSize={42} minSize={22} maxSize={70}>
          <ScrollArea className="h-full">
            <div className="p-2">
              <FileTree
                className="rounded-md border-0 bg-transparent"
                expanded={expandedPaths}
                onExpandedChange={setExpandedPaths}
                selectedPath={selectedPath}
                onSelect={handleSelect}
              >
                <DirectoryListing
                  agentId={agentId}
                  dirPath="."
                  enabled
                  expandedPaths={expandedPaths}
                  onEntries={registerEntries}
                />
              </FileTree>
            </div>
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={58} minSize={30}>
          <div className="flex h-full min-h-0 flex-col">
            {previewPath ? (
              <>
                <div className="border-border flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
                  <span
                    className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs"
                    title={previewPath}
                  >
                    {normalizeWorkspaceRelativePath(previewPath)}
                  </span>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    title="复制相对路径"
                    aria-label="复制相对路径"
                    onClick={() => void copyRelativePath(previewPath)}
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <pre className="px-3 py-2 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap">
                    {contentQuery.isLoading ? (
                      <span className="text-muted-foreground inline-flex items-center gap-2">
                        <Loader2 className="size-3 animate-spin" />
                        Loading file…
                      </span>
                    ) : contentQuery.isError ? (
                      <span className="text-destructive">
                        {(contentQuery.error as Error)?.message || "Unable to preview file"}
                      </span>
                    ) : (
                      contentQuery.data?.content ?? ""
                    )}
                  </pre>
                </ScrollArea>
              </>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
                选择文件以预览
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </aside>
  );
}
