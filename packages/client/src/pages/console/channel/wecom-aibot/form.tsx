import type {
  CreateWecomAibotConnectionDto,
  UpdateWecomAibotConnectionDto,
} from "@buildingai/services/console";
import {
  useConsoleAgentsListQuery,
  useCreateWecomAibotConnectionMutation,
  useTestWecomAibotConnectionMutation,
  useUpdateWecomAibotConnectionMutation,
  useWecomAibotConnectionQuery,
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
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { buildWecomUpdateDto, filterWecomAgents, restoreWecomConnectionForm } from "./model";

export default function WecomAibotConnectionFormPage() {
  const navigate = useNavigate();
  const { connectionId } = useParams();
  const isEdit = Boolean(connectionId);
  const agentsQuery = useConsoleAgentsListQuery({ page: 1, pageSize: 100, status: "all" });
  const connectionQuery = useWecomAibotConnectionQuery(connectionId);
  const agents = useMemo(
    () => filterWecomAgents(agentsQuery.data?.items ?? []),
    [agentsQuery.data?.items],
  );
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [botId, setBotId] = useState("");
  const [botIdPlaceholder, setBotIdPlaceholder] = useState("BotID");
  const [botSecret, setBotSecret] = useState("");
  const [agentAccessToken, setAgentAccessToken] = useState("");

  useEffect(() => {
    if (!connectionQuery.data) return;
    const restored = restoreWecomConnectionForm(connectionQuery.data);
    setAgentId(restored.agentId);
    setName(restored.name);
    setBotId(restored.botId);
    setBotIdPlaceholder(restored.botIdPlaceholder);
    setBotSecret(restored.botSecret);
    setAgentAccessToken(restored.agentAccessToken);
  }, [connectionQuery.data]);

  useEffect(() => {
    if (!isEdit && !agentId && agents[0]) setAgentId(agents[0].id);
  }, [agents, agentId, isEdit]);

  const create = useCreateWecomAibotConnectionMutation({
    onSuccess: () => {
      toast.success("连接已创建，请测试后手动启用");
      navigate("/console/channel/wecom-aibot");
    },
    onError: (error) => toast.error(`创建失败：${error.message}`),
  });
  const update = useUpdateWecomAibotConnectionMutation({
    onSuccess: () => {
      toast.success("连接已保存");
      navigate("/console/channel/wecom-aibot");
    },
    onError: (error) => toast.error(`保存失败：${error.message}`),
  });
  const test = useTestWecomAibotConnectionMutation({
    onSuccess: () => toast.success("企业微信凭证验证成功"),
    onError: (error) => toast.error(`验证失败：${error.message}`),
  });
  const busy = create.isPending || update.isPending;
  const values = { connectionId, agentId, name, botId, botSecret, agentAccessToken };

  const submit = () => {
    if (!agentId || !name.trim()) return toast.error("请填写连接名称并选择标准智能体");
    if (!isEdit && (!botId.trim() || !botSecret.trim() || !agentAccessToken.trim())) {
      return toast.error("请完整填写 BotID、Bot Secret 和智能体 Token");
    }
    if (isEdit) {
      update.mutate({ id: connectionId!, dto: buildWecomUpdateDto(values) });
      return;
    }
    const dto: CreateWecomAibotConnectionDto = {
      agentId,
      name: name.trim(),
      botId: botId.trim(),
      botSecret: botSecret.trim(),
      agentAccessToken: agentAccessToken.trim(),
    };
    create.mutate(dto);
  };

  const testCredentials = () => {
    const dto: UpdateWecomAibotConnectionDto = buildWecomUpdateDto(values);
    if (!isEdit && (!dto.botId || !dto.botSecret || !dto.agentAccessToken)) {
      return toast.error("请完整填写 BotID、Bot Secret 和智能体 Token");
    }
    test.mutate(dto);
  };

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-3xl space-y-5 px-3">
        <Button variant="ghost" onClick={() => navigate("/console/channel/wecom-aibot")}>
          <ArrowLeft />
          返回连接列表
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {isEdit ? "编辑企业微信连接" : "新增企业微信连接"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            一个连接对应一个企业微信智能机器人 BotID，并绑定一个标准智能体。
          </p>
        </div>
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>凭证安全</AlertTitle>
          <AlertDescription>
            Bot Secret 和智能体 Token 只在服务端加密保存，编辑时不会回显；留空表示保持原值。
          </AlertDescription>
        </Alert>
        <FieldGroup>
          <Card>
            <CardHeader>
              <CardTitle>连接信息</CardTitle>
              <CardDescription>为企业微信机器人设置名称并选择目标标准智能体。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>连接名称</FieldLabel>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：企业客服机器人"
                  maxLength={200}
                />
              </Field>
              <Field>
                <FieldLabel>智能体</FieldLabel>
                <Select value={agentId} onValueChange={setAgentId} disabled={isEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择标准智能体" />
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
              <CardTitle>企业微信机器人凭证</CardTitle>
              <CardDescription>
                在企业微信管理后台创建智能机器人并选择 API 模式，然后复制 BotID 和 Secret。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>BotID</FieldLabel>
                <Input
                  value={botId}
                  onChange={(event) => setBotId(event.target.value)}
                  placeholder={isEdit ? `${botIdPlaceholder}（留空不修改）` : "粘贴 BotID"}
                />
              </Field>
              <Field>
                <FieldLabel>Bot Secret</FieldLabel>
                <Input
                  type="password"
                  value={botSecret}
                  onChange={(event) => setBotSecret(event.target.value)}
                  placeholder={isEdit ? "已保存，留空不修改" : "粘贴 Bot Secret"}
                />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel>智能体 Token</FieldLabel>
                <Input
                  type="password"
                  value={agentAccessToken}
                  onChange={(event) => setAgentAccessToken(event.target.value)}
                  placeholder={isEdit ? "已保存，留空不修改" : "粘贴标准智能体发布 Token"}
                />
                <FieldDescription>使用标准智能体发布后的访问 Token。</FieldDescription>
              </Field>
            </CardContent>
          </Card>
        </FieldGroup>
        <div className="flex flex-wrap justify-end gap-2">
          <PermissionGuard permissions="wecom-aibot-channel:test">
            <Button variant="outline" onClick={testCredentials} disabled={test.isPending}>
              {test.isPending && <Loader2 className="animate-spin" />}
              测试凭证
            </Button>
          </PermissionGuard>
          <Button variant="outline" onClick={() => navigate("/console/channel/wecom-aibot")}>
            取消
          </Button>
          <PermissionGuard
            permissions={isEdit ? "wecom-aibot-channel:update" : "wecom-aibot-channel:create"}
          >
            <Button onClick={submit} loading={busy}>
              保存连接
            </Button>
          </PermissionGuard>
        </div>
      </div>
    </PageContainer>
  );
}
