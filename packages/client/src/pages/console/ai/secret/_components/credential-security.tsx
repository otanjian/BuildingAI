import {
  useCreateCredentialMutation,
  useCredentialsQuery,
  useRevokeCredentialMutation,
  useRotateCredentialMutation,
  useTestCredentialMutation,
} from "@buildingai/services/console/credentials";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Loader2, RefreshCw, ShieldCheck, TestTube2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CredentialSecurity = () => {
  const { data = [], refetch, isLoading } = useCredentialsQuery();
  const [form, setForm] = useState({ name: "", provider: "", purpose: "", secret: "" });
  const [rotation, setRotation] = useState<Record<string, string>>({});
  const createMutation = useCreateCredentialMutation({
    onSuccess: () => { toast.success("凭据已加密保存"); setForm({ name: "", provider: "", purpose: "", secret: "" }); refetch(); },
    onError: (error) => toast.error(`创建失败：${error.message}`),
  });
  const rotateMutation = useRotateCredentialMutation({ onSuccess: () => { toast.success("凭据已轮换"); setRotation({}); refetch(); }, onError: (error) => toast.error(`轮换失败：${error.message}`) });
  const testMutation = useTestCredentialMutation({ onSuccess: () => toast.success("连接测试通过（服务端未返回明文）"), onError: (error) => toast.error(`测试失败：${error.message}`) });
  const revokeMutation = useRevokeCredentialMutation({ onSuccess: () => { toast.success("凭据已撤销"); refetch(); }, onError: (error) => toast.error(`撤销失败：${error.message}`) });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Card className="mb-6" data-testid="credential-security">
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" />企业凭据安全（KMS/AES-GCM）</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          {(["name", "provider", "purpose", "secret"] as const).map((key) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`credential-${key}`}>{key === "name" ? "名称" : key === "provider" ? "提供方" : key === "purpose" ? "用途" : "密钥值（仅提交一次）"}</Label>
              <Input id={`credential-${key}`} type={key === "secret" ? "password" : "text"} value={form[key]} onChange={(event) => update(key, event.target.value)} placeholder={key === "secret" ? "不会回显明文" : `输入${key}`} />
            </div>
          ))}
          <div className="flex items-end"><Button disabled={createMutation.isPending || Object.values(form).some((value) => !value.trim())} onClick={() => createMutation.mutate(form)}>{createMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}创建并加密</Button></div>
        </div>
        <div className="rounded-md border">
          <div className="flex items-center justify-between border-b p-3"><span className="font-medium">凭据清单</span><Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 size-4" />刷新</Button></div>
          {isLoading ? <div className="p-4 text-muted-foreground">加载中…</div> : data.length === 0 ? <div className="p-4 text-muted-foreground">暂无企业凭据</div> : data.map((credential) => (
            <div key={credential.id} className="grid gap-3 border-b p-3 last:border-b-0 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div><div className="font-medium">{credential.name}</div><div className="text-sm text-muted-foreground">{credential.provider} · {credential.purpose} · v{credential.version} · {credential.maskedValue}</div><div className="font-mono text-xs text-muted-foreground">指纹 {credential.fingerprint.slice(0, 16)}…</div></div>
              <Badge variant={credential.status === "active" ? "default" : "secondary"}>{credential.status}</Badge>
              <div className="flex gap-2"><Input className="w-44" type="password" placeholder="新值（轮换）" value={rotation[credential.id] || ""} onChange={(event) => setRotation((current) => ({ ...current, [credential.id]: event.target.value }))} /><Button size="sm" variant="outline" disabled={!rotation[credential.id] || rotateMutation.isPending} onClick={() => rotateMutation.mutate({ id: credential.id, data: { secret: rotation[credential.id] } })}>轮换</Button></div>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => testMutation.mutate(credential.id)} disabled={testMutation.isPending}><TestTube2 className="mr-1 size-4" />连接测试</Button><Button size="sm" variant="ghost" onClick={() => revokeMutation.mutate(credential.id)} disabled={credential.status !== "active" || revokeMutation.isPending}><Trash2 className="mr-1 size-4" />撤销</Button></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CredentialSecurity;
