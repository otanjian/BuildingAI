import {
  useDecideToolApprovalMutation,
  useEmergencyToolGatewayMutation,
  useExecuteToolMutation,
  useRequestToolApprovalMutation,
  useToggleToolMutation,
  useToolGatewayApprovalsQuery,
  useToolGatewayExecutionsQuery,
  useToolGatewayMetricsQuery,
  useToolGatewayQuery,
} from "@buildingai/services/console";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import { Input } from "@buildingai/ui/components/ui/input";
import { ShieldAlert, ShieldCheck, TestTube2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/layouts/console/_components/page-container";

const ToolGatewayPage = () => {
  const { data: tools = [], refetch } = useToolGatewayQuery();
  const { data: approvals = [], refetch: refetchApprovals } = useToolGatewayApprovalsQuery();
  const { data: executions = [], refetch: refetchExecutions } = useToolGatewayExecutionsQuery();
  const { data: metrics } = useToolGatewayMetricsQuery();
  const [input, setInput] = useState('{"message":"browser sandbox"}');
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>();
  // Keep the write test key stable during this page session so the second click
  // is an observable idempotent replay instead of creating another execution.
  const [writeKey] = useState(() => `browser-write-${Date.now()}`);
  const allowedCount = executions.filter((execution) => execution.outcome === "allowed").length;
  const deniedCount = executions.filter((execution) => execution.outcome === "denied").length;
  const pendingCount = approvals.filter((approval) => approval.status === "pending").length;

  const parseInput = () => {
    try {
      return JSON.parse(input) as Record<string, unknown>;
    } catch {
      toast.error("输入必须是合法 JSON");
      return null;
    }
  };

  const execute = useExecuteToolMutation({
    onSuccess: (data) => {
      toast.success(data?.replayed || data?.outcome === "replayed" ? "工具执行幂等重放" : "工具执行通过");
      refetchExecutions();
    },
    onError: (error) => toast.error(error.message),
  });
  const request = useRequestToolApprovalMutation({
    onSuccess: () => {
      toast.success("审批申请已创建");
      refetchApprovals();
    },
    onError: (error) => toast.error(error.message),
  });
  const decide = useDecideToolApprovalMutation({
    onSuccess: (data) => {
      toast.success("审批状态已更新");
      if (data?.status === "approved") setSelectedApprovalId(data.id);
      refetchApprovals();
    },
    onError: (error) => toast.error(error.message),
  });
  const toggle = useToggleToolMutation({
    onSuccess: () => {
      toast.success("工具状态已更新");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const emergency = useEmergencyToolGatewayMutation({
    onSuccess: (data) => toast.success(data.disabled ? "已开启紧急禁用" : "已解除紧急禁用"),
    onError: (error) => toast.error(error.message),
  });

  const run = (name: string) => {
    const parsed = parseInput();
    if (!parsed) return;
    const approved = name === "sandbox-write" && selectedApprovalId
      ? { id: selectedApprovalId }
      : undefined;
    execute.mutate({
      tool: name,
      input: parsed,
      ...(name === "sandbox-write" ? { idempotencyKey: writeKey } : {}),
      ...(approved ? { approvalId: approved.id } : {}),
    });
  };

  const requestWriteApproval = () => {
    const parsed = parseInput();
    if (!parsed) return;
    request.mutate({ tool: "sandbox-write", input: parsed });
  };

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">工具网关与出口策略</h1>
        <p className="mt-1 text-sm text-muted-foreground">统一注册、风险分级、审批、SSRF 防护、幂等和脱敏执行记录。</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card><CardContent className="pt-5"><div className="text-sm text-muted-foreground">已放行执行</div><div className="text-2xl font-semibold">{allowedCount}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-sm text-muted-foreground">策略拒绝</div><div className="text-2xl font-semibold">{deniedCount}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-sm text-muted-foreground">待处理审批</div><div className="text-2xl font-semibold">{pendingCount}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-sm text-muted-foreground">SSRF/出口阻断</div><div className="text-2xl font-semibold">{metrics?.blockedEgress ?? 0}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-sm text-muted-foreground">工具失败/超时</div><div className="text-2xl font-semibold">{metrics?.toolFailures ?? 0}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-sm text-muted-foreground">紧急状态</div><div className="text-2xl font-semibold">{metrics?.emergencyDisabled ? "已禁用" : "正常"}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />工具注册与紧急控制
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => emergency.mutate(true)}>
              <ShieldAlert className="mr-1 size-4" />紧急禁用
            </Button>
            <Button variant="outline" onClick={() => emergency.mutate(false)}>解除紧急禁用</Button>
          </div>
          {tools.map((tool) => (
            <div key={tool.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">
                  {tool.name} <Badge variant="outline">{tool.risk}</Badge> <Badge>{tool.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">{tool.description} · {tool.approvalMode} · v{tool.version}</div>
              </div>
              <div className="flex gap-2">
                {tool.name === "sandbox-write" && (
                  <Button size="sm" variant="secondary" onClick={requestWriteApproval} disabled={request.isPending}>申请审批</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => run(tool.name)} disabled={tool.status !== "active" || execute.isPending}>
                  <TestTube2 className="mr-1 size-4" />沙箱测试
                </Button>
                {!tool.id.startsWith("builtin:") && (
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: tool.id, disabled: tool.status === "active" })}>
                    {tool.status === "active" ? "禁用" : "启用"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>测试参数（敏感字段自动脱敏）</CardTitle></CardHeader>
        <CardContent><Input value={input} onChange={(event) => setInput(event.target.value)} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>待处理审批</CardTitle></CardHeader>
        <CardContent>
          {approvals.length === 0 ? <span className="text-muted-foreground">暂无审批</span> : approvals.map((approval) => (
            <div key={approval.id} className="flex items-center justify-between border-b py-2">
              <span>{approval.toolId} · {approval.status} · 参数已脱敏</span>
              {approval.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ id: approval.id, status: "approved" })}>批准</Button>
                  <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: approval.id, status: "rejected" })}>拒绝</Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>脱敏执行记录</CardTitle></CardHeader>
        <CardContent>
          {executions.length === 0 ? <span className="text-muted-foreground">暂无记录</span> : executions.map((execution) => (
            <div key={execution.id} className="border-b py-2 text-sm"><b>{execution.toolName}</b> · {execution.outcome} · {execution.denialReason || "—"} · 输入已脱敏</div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default ToolGatewayPage;
