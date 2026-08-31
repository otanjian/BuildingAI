import {
  type Tenant,
  useArchiveTenantMutation,
  useTenantListQuery,
  useUpdateTenantStatusMutation,
} from "@buildingai/services/console";
import { useAuthStore } from "@buildingai/stores";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
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
import { Building2, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { TenantCreateDialog } from "./_components/tenant-create-dialog";
import { translateTenantStatus } from "./tenant-copy";

const PAGE_SIZE = 20;

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("zh-CN");
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "secondary";
  if (status === "suspended") return "destructive";
  return "outline";
}

const TenantPage = () => {
  const navigate = useNavigate();
  const { confirm } = useAlertDialog();
  const isRoot = useAuthStore((state) => Boolean(state.auth.userInfo?.isRoot));
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const query = useTenantListQuery({
    keyword: debouncedKeyword || undefined,
    status: status === "all" ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
  });
  const statusMutation = useUpdateTenantStatusMutation({
    onSuccess: (tenant) => toast.success(tenant.status === "active" ? "租户已启用" : "租户已停用"),
    onError: (error) => toast.error(`状态更新失败：${error.message}`),
  });
  const archiveMutation = useArchiveTenantMutation({
    onSuccess: () => toast.success("租户已删除"),
    onError: (error) => toast.error(`删除失败：${error.message}`),
  });

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedKeyword) next.set("keyword", debouncedKeyword);
    if (status !== "all") next.set("status", status);
    setSearchParams(next, { replace: true });
  }, [debouncedKeyword, setSearchParams, status]);

  useEffect(() => setPage(1), [debouncedKeyword, status]);

  const { PaginationComponent } = usePagination({
    total: query.data?.total ?? 0,
    pageSize: query.data?.pageSize ?? PAGE_SIZE,
    page,
    onPageChange: setPage,
  });

  const tenants = query.data?.items ?? [];
  const toggleStatus = (tenant: Tenant) => {
    if (tenant.status !== "active" && tenant.status !== "suspended") return;
    statusMutation.mutate({
      tenantId: tenant.id,
      status: tenant.status === "active" ? "suspended" : "active",
    });
  };
  const archiveTenant = async (tenant: Tenant) => {
    try {
      await confirm({
        title: `删除「${tenant.name}」？`,
        description:
          "删除将把租户归档，已有业务数据不会被删除。默认租户或包含业务数据的租户可能无法删除。",
        confirmText: "确认删除",
        confirmVariant: "destructive",
      });
      archiveMutation.mutate(tenant.id);
    } catch {
      // User cancelled the confirmation dialog.
    }
  };

  return (
    <PageContainer className="md:h-inset mx-0">
      <div className="flex h-full flex-col gap-5 px-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">租户管理</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              统一管理租户生命周期、成员和访问状态。
            </p>
          </div>
          {isRoot && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> 新增租户
            </Button>
          )}
        </div>
        <section className="border-border bg-background flex flex-wrap items-end gap-3 rounded-lg border p-4">
          <div className="min-w-[260px] flex-1 space-y-1">
            <label className="text-sm font-medium" htmlFor="tenant-filter-keyword">
              租户筛选
            </label>
            <Input
              id="tenant-filter-keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="按租户编码或名称搜索"
            />
          </div>
          <div className="w-[160px] space-y-1">
            <label className="text-sm font-medium">状态</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="suspended">已停用</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-muted-foreground pb-2 text-xs">
            共 {query.data?.total ?? 0} 个租户
          </div>
        </section>
        <section className="border-border bg-background min-h-0 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>租户编码</TableHead>
                <TableHead>租户名称</TableHead>
                <TableHead>当前状态</TableHead>
                <TableHead>成员数量</TableHead>
                <TableHead>开通日期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    加载中…
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                    没有匹配的租户
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading &&
                tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-mono text-xs">{tenant.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="text-muted-foreground size-4" />
                        <span className="font-medium">{tenant.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(tenant.status)}>
                        {translateTenantStatus(tenant.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{tenant.memberCount ?? 0}</TableCell>
                    <TableCell>{formatDate(tenant.openingDate ?? tenant.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/console/tenant/${tenant.id}/members`)}
                        >
                          <Users /> 成员
                        </Button>
                        {isRoot &&
                          (tenant.status === "active" || tenant.status === "suspended") && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={statusMutation.isPending}
                              onClick={() => toggleStatus(tenant)}
                            >
                              {statusMutation.isPending && <Loader2 className="animate-spin" />}
                              {tenant.status === "active" ? "停用" : "启用"}
                            </Button>
                          )}
                        {isRoot && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={archiveMutation.isPending}
                            onClick={() => void archiveTenant(tenant)}
                          >
                            <Trash2 /> 删除
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </section>
        <PaginationComponent className="py-1" />
      </div>
      <TenantCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => void query.refetch()}
      />
    </PageContainer>
  );
};

export default TenantPage;
