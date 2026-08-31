import {
  useDeleteWecomAibotConnectionMutation,
  useToggleWecomAibotConnectionMutation,
  useWecomAibotConnectionsQuery,
  type WecomAibotConnectionStatus,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Alert, AlertDescription, AlertTitle } from "@buildingai/ui/components/ui/alert";
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
import { Edit, Info, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { buildWecomToggleTarget, wecomConnectionStateLabels } from "./model";

const PAGE_SIZE = 15;

export default function WecomAibotConnectionListPage() {
  const navigate = useNavigate();
  const { confirm } = useAlertDialog();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const query = useWecomAibotConnectionsQuery({
    page,
    pageSize: PAGE_SIZE,
    keyword: debouncedKeyword || undefined,
  });
  const toggle = useToggleWecomAibotConnectionMutation({
    onSuccess: (item) => toast.success(item.enabled ? "连接已启用" : "连接已停用"),
    onError: (error) => toast.error(`操作失败：${error.message}`),
  });
  const remove = useDeleteWecomAibotConnectionMutation({
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

  const handleDelete = async (item: WecomAibotConnectionStatus) => {
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
            <h1 className="text-2xl font-semibold">企业微信智能机器人</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              使用企业微信 WebSocket 长连接，把标准智能体接入单聊和群聊。
            </p>
          </div>
          <PermissionGuard permissions="wecom-aibot-channel:create">
            <Button onClick={() => navigate("/console/channel/wecom-aibot/new")}>
              <Plus />
              新增连接
            </Button>
          </PermissionGuard>
        </div>
        <Alert>
          <Info className="size-4" />
          <AlertTitle>每个 BotID 同时只能保持一条长连接</AlertTitle>
          <AlertDescription>
            多实例部署时由 Redis 租约确保只有一个实例持有连接；新建连接保存后默认停用。
          </AlertDescription>
        </Alert>
        <div className="flex items-center gap-2">
          <Input
            className="h-9 max-w-sm"
            placeholder="搜索连接名称、智能体或 BotID"
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
                <TableHead>BotID</TableHead>
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
                    暂无企业微信连接
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.connectionId}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.agentName || "未关联智能体"}</TableCell>
                  <TableCell className="font-mono text-xs">{item.botId || "—"}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge
                        variant={
                          item.connectionState === "connected"
                            ? "secondary"
                            : item.connectionState === "error"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {wecomConnectionStateLabels[item.connectionState]}
                      </Badge>
                      {item.lastError && (
                        <p
                          className="text-destructive max-w-72 truncate text-xs"
                          title={item.lastError}
                        >
                          {item.lastError}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <PermissionGuard permissions="wecom-aibot-channel:toggle">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate(buildWecomToggleTarget(item))}
                      >
                        {item.enabled ? "停用" : "启用"}
                      </Button>
                    </PermissionGuard>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <PermissionGuard permissions="wecom-aibot-channel:update">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            navigate(`/console/channel/wecom-aibot/${item.connectionId}`)
                          }
                          aria-label="编辑"
                        >
                          <Edit />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard permissions="wecom-aibot-channel:delete">
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
