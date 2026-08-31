import {
  useDeleteTenantMemberMutation,
  useInviteTenantMemberMutation,
  useSetTenantAdministratorMutation,
  useTenantListQuery,
  useTenantMembersQuery,
  useUpdateTenantMemberMutation,
} from "@buildingai/services/console";
import { useTenantContextStore } from "@buildingai/stores";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
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
import { ArrowLeft, Loader2, UserPlus, UserRoundCog, UserRoundMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

const TenantMembersPage = () => {
  const { tenantId = "" } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { confirm } = useAlertDialog();
  const tenantListQuery = useTenantListQuery({ page: 1, pageSize: 100 });
  const tenant = tenantListQuery.data?.items.find((item) => item.id === tenantId);
  const activeTenantId = useTenantContextStore((state) => state.tenantContext.activeTenantId);
  const membersQuery = useTenantMembersQuery(tenantId, {
    enabled: Boolean(tenantId) && (!activeTenantId || activeTenantId === tenantId),
  });
  const { setActiveTenantId } = useTenantContextStore((state) => state.tenantContextActions);
  const [account, setAccount] = useState("");

  useEffect(() => {
    if (tenant?.status === "active") setActiveTenantId(tenant.id);
  }, [setActiveTenantId, tenant]);

  const inviteMutation = useInviteTenantMemberMutation({
    onSuccess: () => {
      setAccount("");
      toast.success("成员已添加");
    },
    onError: (error) => toast.error(`添加失败：${error.message}`),
  });
  const updateMutation = useUpdateTenantMemberMutation({
    onSuccess: () => toast.success("成员状态已更新"),
    onError: (error) => toast.error(`更新失败：${error.message}`),
  });
  const administratorMutation = useSetTenantAdministratorMutation({
    onSuccess: () => toast.success("租户管理员已更新"),
    onError: (error) => toast.error(`管理员更新失败：${error.message}`),
  });
  const deleteMutation = useDeleteTenantMemberMutation({
    onSuccess: () => toast.success("成员已移除"),
    onError: (error) => toast.error(`移除失败：${error.message}`),
  });

  const addMember = () => {
    const value = account.trim();
    if (!tenantId || !value) return;
    inviteMutation.mutate(
      value.includes("@")
        ? { tenantId, invitationEmail: value, roleCode: "member" }
        : { tenantId, username: value, roleCode: "member" },
    );
  };

  const removeMember = async (memberId: string, name: string) => {
    try {
      await confirm({
        title: `移除「${name}」？`,
        description:
          "移除成员只会解除其与当前租户的关系，不会删除全局用户账号。唯一管理员不能被移除。",
        confirmText: "确认移除",
        confirmVariant: "destructive",
      });
      deleteMutation.mutate({ tenantId, membershipId: memberId });
    } catch {
      // User cancelled the confirmation dialog.
    }
  };

  if (!tenantId) return null;

  return (
    <PageContainer className="md:h-inset mx-0">
      <div className="flex h-full flex-col gap-5 px-4 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="返回租户列表">
            <Link to="/console/tenant">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">租户成员</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {tenant?.name ?? "租户"}（{tenant?.code ?? tenantId}）
            </p>
          </div>
          {tenant && (
            <Badge variant={tenant.status === "active" ? "secondary" : "destructive"}>
              {tenant.status === "active" ? "正常" : "已停用"}
            </Badge>
          )}
        </div>

        <section className="border-border bg-background rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="size-4" />
            <h2 className="font-medium">添加成员</h2>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1 space-y-1">
              <label className="text-sm" htmlFor="member-account">
                用户名或邮箱
              </label>
              <Input
                id="member-account"
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                placeholder="输入已有用户名或邮箱"
              />
            </div>
            <Button disabled={!account.trim() || inviteMutation.isPending} onClick={addMember}>
              {inviteMutation.isPending && <Loader2 className="animate-spin" />}添加成员
            </Button>
          </div>
        </section>

        <section className="border-border bg-background min-h-0 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>成员</TableHead>
                <TableHead>身份</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                    加载中…
                  </TableCell>
                </TableRow>
              )}
              {!membersQuery.isLoading && (membersQuery.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                    暂无成员
                  </TableCell>
                </TableRow>
              )}
              {(membersQuery.data ?? []).map((member) => {
                const name =
                  member.user?.nickname ??
                  member.user?.username ??
                  member.invitationEmail ??
                  "待接受邀请";
                const isAdmin =
                  Boolean(member.isAdministrator) ||
                  member.user?.id === (tenant?.adminUserId ?? tenant?.ownerId);
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8 rounded-md">
                          <AvatarImage alt={name} />
                          <AvatarFallback className="rounded-md">{name.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div>{name}</div>
                          {member.user?.email && (
                            <div className="text-muted-foreground text-xs">{member.user.email}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isAdmin ? "default" : "secondary"}>
                        {isAdmin ? "管理员" : "成员"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.status === "active"
                        ? "正常"
                        : member.status === "invited"
                          ? "待接受"
                          : "已停用"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {member.user?.id && !isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={administratorMutation.isPending}
                            onClick={() =>
                              administratorMutation.mutate({ tenantId, userId: member.user!.id })
                            }
                          >
                            <UserRoundCog />
                            设为管理员
                          </Button>
                        )}
                        {member.user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({
                                tenantId,
                                membershipId: member.id,
                                status: member.status === "suspended" ? "active" : "suspended",
                              })
                            }
                          >
                            {member.status === "suspended" ? "启用" : "停用"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          disabled={deleteMutation.isPending || isAdmin}
                          onClick={() => void removeMember(member.id, name)}
                        >
                          <UserRoundMinus />
                          移除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => navigate("/console/tenant")}>
            返回租户列表
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default TenantMembersPage;
