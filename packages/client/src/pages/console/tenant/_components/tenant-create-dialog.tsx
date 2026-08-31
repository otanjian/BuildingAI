import { type CreateTenantInput, useCreateTenantMutation } from "@buildingai/services/console";
import { useUsersListQuery } from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input, PasswordInput } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TenantCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

type FormState = {
  name: string;
  code: string;
  adminUserId: string;
  username: string;
  password: string;
  email: string;
  nickname: string;
  realName: string;
  phone: string;
};

const initialForm: FormState = {
  name: "",
  code: "",
  adminUserId: "",
  username: "",
  password: "",
  email: "",
  nickname: "",
  realName: "",
  phone: "",
};

export function TenantCreateDialog({ open, onOpenChange, onSuccess }: TenantCreateDialogProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [administratorMode, setAdministratorMode] = useState<"existing" | "new">("existing");
  const usersQuery = useUsersListQuery(
    { page: 1, pageSize: 100, status: 1 },
    { enabled: open && administratorMode === "existing" },
  );
  const createMutation = useCreateTenantMutation({
    onSuccess: () => {
      toast.success("租户创建成功");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => toast.error(`创建失败：${error.message}`),
  });

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setAdministratorMode("existing");
    }
  }, [open]);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    const name = form.name.trim();
    const code = form.code.trim();
    if (name.length < 2) {
      toast.error("租户名称至少需要 2 个字符");
      return;
    }
    if (code.length < 2) {
      toast.error("租户编码至少需要 2 个字符");
      return;
    }
    if (administratorMode === "existing" && !form.adminUserId) {
      toast.error("请选择租户管理员");
      return;
    }
    if (
      administratorMode === "new" &&
      (form.username.trim().length < 3 || form.password.length < 6)
    ) {
      toast.error("新管理员用户名至少 3 个字符，密码至少 6 个字符");
      return;
    }

    const body: CreateTenantInput = {
      name,
      code,
      ...(administratorMode === "existing"
        ? { adminUserId: form.adminUserId }
        : {
            username: form.username.trim(),
            password: form.password,
            email: form.email.trim() || undefined,
            nickname: form.nickname.trim() || undefined,
            realName: form.realName.trim() || undefined,
            phone: form.phone.trim() || undefined,
          }),
    };
    createMutation.mutate(body);
  };

  const users = usersQuery.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新增租户</DialogTitle>
          <DialogDescription>
            创建租户并指定一名唯一管理员，管理员可继续维护租户成员。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="tenant-name">租户名称</Label>
            <Input
              id="tenant-name"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="例如：华东运营中心"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tenant-code">租户编码</Label>
            <Input
              id="tenant-code"
              value={form.code}
              onChange={(event) => update("code", event.target.value)}
              placeholder="例如：east-ops"
            />
          </div>
          <div className="grid gap-2">
            <Label>管理员来源</Label>
            <Select
              value={administratorMode}
              onValueChange={(value) => setAdministratorMode(value as "existing" | "new")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">选择已有用户</SelectItem>
                <SelectItem value="new">创建新用户</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {administratorMode === "existing" ? (
            <div className="grid gap-2">
              <Label>租户管理员</Label>
              <Select
                value={form.adminUserId}
                onValueChange={(value) => update("adminUserId", value)}
              >
                <SelectTrigger disabled={usersQuery.isLoading}>
                  <SelectValue placeholder={usersQuery.isLoading ? "加载用户中…" : "请选择用户"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nickname || user.username}（{user.username}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-3 rounded-md border p-3">
              <div className="grid gap-2">
                <Label htmlFor="tenant-admin-username">管理员用户名</Label>
                <Input
                  id="tenant-admin-username"
                  value={form.username}
                  onChange={(event) => update("username", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenant-admin-password">初始密码</Label>
                <PasswordInput
                  id="tenant-admin-password"
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenant-admin-email">邮箱（可选）</Label>
                <Input
                  id="tenant-admin-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenant-admin-nickname">昵称（可选）</Label>
                <Input
                  id="tenant-admin-nickname"
                  value={form.nickname}
                  onChange={(event) => update("nickname", event.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="animate-spin" />}
            创建租户
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
