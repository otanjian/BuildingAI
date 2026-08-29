import type {
  CreateFeishuConnectionDto,
  UpdateFeishuConnectionDto,
} from "@buildingai/services/console";
import {
  useConsoleAgentsListQuery,
  useCreateFeishuConnectionMutation,
  useFeishuConnectionQuery,
  useTestFeishuConnectionMutation,
  useUpdateFeishuConnectionMutation,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Alert, AlertDescription, AlertTitle } from "@buildingai/ui/components/ui/alert";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@buildingai/ui/components/ui/field";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";
import { filterFeishuAgents } from "./selection";

export default function FeishuConnectionFormPage() {
  const navigate = useNavigate();
  const { connectionId } = useParams();
  const isEdit = Boolean(connectionId);
  const agentsQuery = useConsoleAgentsListQuery({ page: 1, pageSize: 100, status: "all" });
  const connectionQuery = useFeishuConnectionQuery(connectionId);
  const agents = useMemo(
    () => filterFeishuAgents(agentsQuery.data?.items ?? []),
    [agentsQuery.data?.items],
  );
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [agentAccessToken, setAgentAccessToken] = useState("");
  const [onlyMentioned, setOnlyMentioned] = useState(true);
  useEffect(() => {
    const item = connectionQuery.data;
    if (item) {
      setAgentId(item.agentId);
      setName(item.name);
      setOnlyMentioned(item.onlyMentioned);
    }
  }, [connectionQuery.data]);
  useEffect(() => {
    if (!isEdit && !agentId && agents[0]) setAgentId(agents[0].id);
  }, [agents, agentId, isEdit]);
  const create = useCreateFeishuConnectionMutation({
    onSuccess: () => {
      toast.success("连接已创建");
      navigate("/console/channel/feishu");
    },
    onError: (error) => toast.error(`创建失败：${error.message}`),
  });
  const update = useUpdateFeishuConnectionMutation({
    onSuccess: () => {
      toast.success("连接已保存");
      navigate("/console/channel/feishu");
    },
    onError: (error) => toast.error(`保存失败：${error.message}`),
  });
  const test = useTestFeishuConnectionMutation({
    onSuccess: () => toast.success("飞书凭证验证成功"),
    onError: (error) => toast.error(`验证失败：${error.message}`),
  });
  const busy = create.isPending || update.isPending;
  const getTestDto = (): UpdateFeishuConnectionDto => ({
    connectionId,
    agentId: agentId || undefined,
    appId: appId.trim() || undefined,
    appSecret: appSecret.trim() || undefined,
    agentAccessToken: agentAccessToken.trim() || undefined,
  });
  const submit = () => {
    if (!agentId || !name.trim() || (!appId.trim() && !isEdit) || (!appSecret.trim() && !isEdit))
      return toast.error("请完整填写连接名称和飞书凭证");
    if (!isEdit && !agentAccessToken.trim()) return toast.error("请填写智能体 Token");
    if (isEdit)
      update.mutate({
        id: connectionId!,
        dto: {
          agentId,
          name: name.trim(),
          appId: appId.trim() || undefined,
          appSecret: appSecret.trim() || undefined,
          agentAccessToken: agentAccessToken.trim() || undefined,
          onlyMentioned,
        },
      });
    else {
      const dto: CreateFeishuConnectionDto = {
        agentId,
        name: name.trim(),
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        agentAccessToken: agentAccessToken.trim() || undefined,
        onlyMentioned,
      };
      create.mutate(dto);
    }
  };
  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-3xl space-y-5 px-3">
        <Button variant="ghost" onClick={() => navigate("/console/channel/feishu")}>
          <ArrowLeft />
          返回连接列表
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{isEdit ? "编辑飞书连接" : "新增飞书连接"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            每个连接对应一个飞书 App，可指向一个 BuildingAI 智能体。
          </p>
        </div>
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>凭证安全</AlertTitle>
          <AlertDescription>
            App Secret 和智能体 Token 只在服务端加密保存，编辑时不会回显；留空表示保持原值。
          </AlertDescription>
        </Alert>
        <FieldGroup>
          <Card>
            <CardHeader>
              <CardTitle>连接信息</CardTitle>
              <CardDescription>为这组飞书凭证设置一个便于识别的名称。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>连接名称</FieldLabel>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：客服机器人"
                  maxLength={200}
                />
              </Field>
              <Field>
                <FieldLabel>智能体</FieldLabel>
                <Select value={agentId} onValueChange={setAgentId} disabled={isEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择智能体" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}（标准）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>飞书应用凭证</CardTitle>
              <CardDescription>飞书开放平台 → 凭证与基础信息。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>App ID</FieldLabel>
                <Input
                  value={appId}
                  onChange={(event) => setAppId(event.target.value)}
                  placeholder={connectionQuery.data?.appId || "cli_xxx"}
                />
              </Field>
              <Field>
                <FieldLabel>App Secret</FieldLabel>
                <Input
                  type="password"
                  value={appSecret}
                  onChange={(event) => setAppSecret(event.target.value)}
                  placeholder={isEdit ? "已保存，留空不修改" : "粘贴 App Secret"}
                />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel>智能体 Token</FieldLabel>
                <Input
                  type="password"
                  value={agentAccessToken}
                  onChange={(event) => setAgentAccessToken(event.target.value)}
                  placeholder={isEdit ? "已保存，留空不修改" : "粘贴 Token 或发布链接"}
                />
                <FieldDescription>支持粘贴标准智能体 Token 或完整发布链接。</FieldDescription>
              </Field>
              <Field className="md:col-span-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FieldLabel>群聊仅在被 @ 时回复</FieldLabel>
                    <FieldDescription>开启后，群聊中未 @ 机器人的消息会被忽略。</FieldDescription>
                  </div>
                  <Switch checked={onlyMentioned} onCheckedChange={setOnlyMentioned} />
                </div>
              </Field>
            </CardContent>
          </Card>
        </FieldGroup>
        <div className="flex flex-wrap justify-end gap-2">
          <PermissionGuard permissions="feishu-channel:test">
            <Button
              variant="outline"
              onClick={() => test.mutate(getTestDto())}
              disabled={test.isPending || (!appId.trim() && !isEdit)}
            >
              {test.isPending && <Loader2 className="animate-spin" />}测试凭证
            </Button>
          </PermissionGuard>
          <Button variant="outline" onClick={() => navigate("/console/channel/feishu")}>
            取消
          </Button>
          <PermissionGuard permissions="feishu-channel:update">
            <Button onClick={submit} loading={busy}>
              保存连接
            </Button>
          </PermissionGuard>
        </div>
      </div>
    </PageContainer>
  );
}
