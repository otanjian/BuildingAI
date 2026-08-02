import {
  useAgentAssignmentsQuery,
  useAssignUsersMutation,
  useUnassignUsersMutation,
  useUpdateSquareVisibilityMutation,
} from "@buildingai/services/console";
import { useSearchUserQuery, useUsersListQuery } from "@buildingai/services/console";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export interface AgentAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  currentVisibility?: string;
  onVisibilityChange?: () => void;
}

const DEFAULT_PAGE_SIZE = 50;

export function AgentAssignDialog({
  open,
  onOpenChange,
  agentId,
  currentVisibility,
  onVisibilityChange,
}: AgentAssignDialogProps) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const isSearchMode = searchKeyword.trim().length > 0;

  const { data: assignments, isLoading: isLoadingAssignments } = useAgentAssignmentsQuery(
    open ? agentId : undefined,
  );

  // Default: show first 50 users
  const { data: userListData, isLoading: isLoadingUsers } = useUsersListQuery(
    { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    { enabled: open && !isSearchMode },
  );

  // Search mode
  const { data: searchedUsers = [], isFetching: isSearching } = useSearchUserQuery(searchKeyword, {
    enabled: open && isSearchMode,
  });

  const allUsers = useMemo(() => {
    if (isSearchMode) return searchedUsers;
    return userListData?.items ?? [];
  }, [isSearchMode, searchedUsers, userListData]);

  const assignedUserIds = useMemo(
    () => new Set(assignments?.map((a) => a.userId) ?? []),
    [assignments],
  );

  const availableUsers = useMemo(
    () => allUsers.filter((u) => !assignedUserIds.has(u.id)),
    [allUsers, assignedUserIds],
  );

  const isLoading = isSearchMode ? isSearching : isLoadingUsers;

  const assignMutation = useAssignUsersMutation(agentId, {
    onSuccess: () => {
      setSelectedUserIds(new Set());
      setSearchKeyword("");
      toast.success("分配成功");
    },
    onError: () => toast.error("分配失败"),
  });

  const unassignMutation = useUnassignUsersMutation(agentId, {
    onSuccess: () => toast.success("移除成功"),
    onError: () => toast.error("移除失败"),
  });

  const visibilityMutation = useUpdateSquareVisibilityMutation(agentId, {
    onSuccess: () => {
      toast.success("可见性已更新");
      onVisibilityChange?.();
    },
    onError: () => toast.error("更新失败"),
  });

  const isAssignedMode = currentVisibility === "assigned";

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (availableUsers.length === 0) return;
    const allSelected = availableUsers.every((u) => selectedUserIds.has(u.id));
    setSelectedUserIds(allSelected ? new Set() : new Set(availableUsers.map((u) => u.id)));
  };

  const allSelected =
    availableUsers.length > 0 && availableUsers.every((u) => selectedUserIds.has(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>分配用户</DialogTitle>
        </DialogHeader>

        {/* Visibility toggle */}
        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <span className="text-sm font-medium">仅分配给指定用户</span>
            <p className="text-muted-foreground text-xs">
              {isAssignedMode
                ? "仅分配列表中的用户可在广场看到此智能体"
                : "所有用户均可在广场看到此智能体"}
            </p>
          </div>
          <Switch
            checked={isAssignedMode}
            onCheckedChange={(checked) =>
              visibilityMutation.mutate({ visibility: checked ? "assigned" : "all" })
            }
            disabled={visibilityMutation.isPending}
          />
        </div>

        <div className="space-y-4">
          {/* Search */}
          <div>
            <Label className="text-sm font-medium">搜索用户</Label>
            <Input
              className="mt-1.5"
              placeholder="输入用户名搜索..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setSelectedUserIds(new Set());
              }}
            />
          </div>

          {/* Available users to assign */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                可选用户
                {!isLoading && (
                  <Badge variant="secondary" className="ml-2">
                    {availableUsers.length}
                  </Badge>
                )}
              </Label>
              {availableUsers.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleToggleAll}>
                  {allSelected ? "取消全选" : "全选"}
                </Button>
              )}
            </div>
            <div className="mt-1.5 max-h-64 overflow-y-auto rounded-md border">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-md" />
                  ))}
                </div>
              ) : availableUsers.length === 0 ? (
                <p className="text-muted-foreground p-4 text-center text-sm">
                  {isSearchMode ? "未找到匹配用户" : "暂无可分配用户"}
                </p>
              ) : (
                availableUsers.map((user) => (
                  <label
                    key={user.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedUserIds.has(user.id)}
                      onCheckedChange={() => handleToggleUser(user.id)}
                    />
                    <span className="text-sm">{user.nickname || user.username}</span>
                    <span className="text-muted-foreground text-xs">@{user.username}</span>
                  </label>
                ))
              )}
            </div>

            {selectedUserIds.size > 0 && (
              <div className="mt-2">
                <Button
                  size="sm"
                  onClick={() => assignMutation.mutate({ userIds: Array.from(selectedUserIds) })}
                  disabled={assignMutation.isPending}
                >
                  {assignMutation.isPending && <Loader2 className="mr-1 size-3 animate-spin" />}
                  添加选中 ({selectedUserIds.size})
                </Button>
              </div>
            )}
          </div>

          {/* Current assignments */}
          <div>
            <Label className="text-sm font-medium">
              已分配用户
              {assignments && (
                <Badge variant="secondary" className="ml-2">
                  {assignments.length}
                </Badge>
              )}
            </Label>
            <div className="mt-1.5 space-y-1">
              {isLoadingAssignments ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              ) : assignments && assignments.length > 0 ? (
                assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {assignment.user.nickname || assignment.user.username}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        @{assignment.user.username}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={unassignMutation.isPending}
                      onClick={() => unassignMutation.mutate({ userIds: [assignment.userId] })}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">暂无分配用户</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
