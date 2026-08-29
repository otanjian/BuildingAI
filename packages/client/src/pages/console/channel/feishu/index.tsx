import {
  type FeishuConnectionStatus,
  useDeleteFeishuConnectionMutation,
  useFeishuConnectionsQuery,
  useToggleFeishuConnectionMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { Edit, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { PageContainer } from "@/layouts/console/_components/page-container";

const PAGE_SIZE = 15;
const stateLabels: Record<FeishuConnectionStatus["connectionState"], string> = {
  stopped: "未启动",
  connecting: "连接中",
  connected: "已连接",
  error: "异常",
};

export default function FeishuConnectionListPage() {
  const navigate = useNavigate();
  const { confirm } = useAlertDialog();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const query = useFeishuConnectionsQuery({
    page,
    pageSize: PAGE_SIZE,
    keyword: debouncedKeyword || undefined,
  });
  const toggle = useToggleFeishuConnectionMutation({
    onSuccess: (item) => toast.success(item.enabled ? "连接已启用" : "连接已停用"),
    onError: (error) => toast.error(`操作失败：${error.message}`),
  });
  const remove = useDeleteFeishuConnectionMutation({
    onSuccess: () => {
      toast.success("连接已删除");
      void query.refetch();
    },
    onError: (error) => toast.error(`删除失败：${error.message}`),
  });
  const items = query.data?.items ?? [];
  const { PaginationComponent } = usePagination({
    total: query.data?.total ?? 0,
    pageSize: PAGE_SIZE,
    page,
    onPageChange: setPage,
  });
  useEffect(() => setPage(1), [debouncedKeyword]);
  const handleDelete = async (item: FeishuConnectionStatus) => {
    try {
      await confirm({
        title: `删除「${item.name}」？`,
        description: "删除后会停止长连接并清理该连接的会话和幂等状态。",
        confirmVariant: "destructive",
      });
      remove.mutate(item.connectionId);
    } catch {
      /* User cancelled the dialog. */
    }
  };
  return (
    <PageContainer className="md:h-inset mx-0">
      <div className="flex h-full flex-col gap-5 px-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">飞书机器人</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              一个智能体可以绑定多个飞书 App，分别管理连接状态和会话。
            </p>
          </div>
          <PermissionGuard permissions="feishu-channel:create">
            <Button onClick={() => navigate("/console/channel/feishu/new")}>
              <Plus />
              新增连接
            </Button>
          </PermissionGuard>
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="h-9 max-w-sm"
            placeholder="搜索连接名称、智能体或 App ID"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            aria-label="刷新"
          >
            <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
        <div className="flex-1 overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>连接名称</TableHead>
                <TableHead>智能体</TableHead>
                <TableHead>飞书 App</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>启用</TableHead>
                <TableHead className="w-[150px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                    加载中…
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                    暂无飞书连接
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.connectionId}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.agentName || "未关联智能体"}</TableCell>
                  <TableCell className="font-mono text-xs">{item.appId || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.connectionState === "connected"
                          ? "secondary"
                          : item.connectionState === "error"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {stateLabels[item.connectionState]}
                    </Badge>
                    {item.migrationStatus && item.migrationStatus !== "active" && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {item.migrationStatus}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PermissionGuard permissions="feishu-channel:toggle">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={
                          toggle.isPending ||
                          item.migrationStatus === "conflict" ||
                          item.migrationStatus === "orphaned"
                        }
                        onClick={() =>
                          toggle.mutate({ id: item.connectionId, enabled: !item.enabled })
                        }
                      >
                        {item.enabled ? "停用" : "启用"}
                      </Button>
                    </PermissionGuard>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <PermissionGuard permissions="feishu-channel:update">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => navigate(`/console/channel/feishu/${item.connectionId}`)}
                          aria-label="编辑"
                        >
                          <Edit />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard permissions="feishu-channel:delete">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={() => void handleDelete(item)}
                          aria-label="删除"
                        >
                          <Trash2 />
                        </Button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {query.data && query.data.total > 0 && <PaginationComponent className="mx-0 w-fit" />}
      </div>
    </PageContainer>
  );
}
