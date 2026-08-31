import {
  getAgentVersionWorkspace,
  type AgentVersionWorkspace,
} from "@buildingai/services/web";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { RefreshCcw, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type WorkspaceVersion = {
  id?: string;
  versionNumber?: number;
  label?: string | null;
  status?: string;
  configHash?: string;
  releaseNote?: string | null;
  diff?: Array<{ path?: string; before?: unknown; after?: unknown }>;
  dependencies?: Array<{
    dependencyType?: string;
    dependencyId?: string;
    dependencyVersion?: string | null;
  }>;
  evaluationEvidence?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt?: string;
};

type WorkspaceRelease = {
  id?: string;
  versionId?: string;
  environment?: string;
  status?: string;
  trafficPercent?: number;
  cohortId?: string | null;
  revision?: number;
  rollbackTargetVersionId?: string | null;
  approvals?: Array<{
    status?: string;
    gateName?: string;
    approvedBy?: string | null;
  }>;
};

const statusLabel: Record<string, string> = {
  active: "生产生效",
  approved: "已批准",
  archived: "已归档",
  canary: "灰度中",
  draft: "草稿",
  failed: "门禁失败",
  not_released: "未发布",
  paused: "已暂停",
  pending: "待审批",
  published: "已发布",
  rejected: "已拒绝",
  rolled_back: "已回滚",
  submitted: "审批中",
};

function shortHash(value?: string) {
  if (!value) return "—";
  return value.length > 16 ? `${value.slice(0, 12)}…${value.slice(-4)}` : value;
}

function displayStatus(value?: string) {
  return statusLabel[value ?? ""] ?? value ?? "未知";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function ReleaseGovernance({ agentId }: { agentId?: string }) {
  const [workspace, setWorkspace] = useState<AgentVersionWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await getAgentVersionWorkspace(agentId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "版本发布状态加载失败");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const versions = (workspace?.versions ?? []) as WorkspaceVersion[];
  const releases = (workspace?.releases ?? []) as WorkspaceRelease[];
  const activeRelease = releases.find(
    (release) =>
      release.environment === "production" && ["active", "canary"].includes(release.status ?? ""),
  );
  const activeVersion = versions.find(
    (version) => version.id === workspace?.environmentRelease.activeVersionId,
  );
  const latestVersion = versions[0];
  const latestApproval = activeRelease?.approvals?.[0];
  const blockedReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!latestVersion) reasons.push("尚无版本快照，请先保存智能体配置生成草稿");
    if (latestVersion?.status === "draft") reasons.push("当前草稿尚未提交审批");
    if (latestVersion?.status === "submitted") reasons.push("等待授权审批人完成门禁审批");
    if (latestVersion?.status === "failed") reasons.push("必需评测门禁未通过，生产指针保持不变");
    if (!activeRelease) reasons.push("当前没有可执行回滚的生产发布");
    return reasons;
  }, [activeRelease, latestVersion]);

  return (
    <div className="space-y-4 pb-6 pr-2">
      <section className="border-border bg-card rounded-lg border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary h-4 w-4" />
              <h2 className="font-semibold">企业版本发布治理</h2>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              版本快照不可变；广场内容审核与租户生产发布相互独立。
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadWorkspace()} disabled={loading}>
            <RefreshCcw className={loading ? "animate-spin" : ""} />
            刷新状态
          </Button>
        </div>

        {error ? (
          <div className="border-destructive/30 bg-destructive/5 text-destructive mt-4 rounded-md border p-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-muted/40 rounded-md p-3">
            <p className="text-muted-foreground text-xs">广场内容审核</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary">{displayStatus(workspace?.contentReview.status)}</Badge>
              <span className="text-xs">不代表生产可用</span>
            </div>
          </div>
          <div className="bg-muted/40 rounded-md p-3">
            <p className="text-muted-foreground text-xs">租户生产环境</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge>{displayStatus(workspace?.environmentRelease.status)}</Badge>
              <span className="font-mono text-xs">rev {workspace?.environmentRelease.revision ?? "—"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-border rounded-lg border p-4">
        <h3 className="text-sm font-semibold">当前生产指针</h3>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">生效版本</p>
            <p className="mt-1 font-medium">
              {activeVersion ? `v${activeVersion.versionNumber ?? "?"}` : "尚未发布"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">配置哈希</p>
            <p className="mt-1 font-mono" title={activeVersion?.configHash}>
              {shortHash(activeVersion?.configHash)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">流量范围</p>
            <p className="mt-1">
              {activeRelease?.status === "canary"
                ? `测试 cohort · ${activeRelease.trafficPercent ?? 0}%`
                : activeRelease
                  ? "全部生产流量"
                  : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">审批证据</p>
            <p className="mt-1">
              {latestApproval
                ? `${latestApproval.gateName ?? "default"} · ${displayStatus(latestApproval.status)}`
                : "暂无批准记录"}
            </p>
          </div>
        </div>
      </section>

      <section className="border-border rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">版本快照与依赖</h3>
          <span className="text-muted-foreground text-xs">凭据仅显示引用，不展示密钥值</span>
        </div>
        <div className="mt-3 space-y-3">
          {versions.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
              {loading ? "正在加载版本…" : "暂无版本快照"}
            </p>
          ) : (
            versions.slice(0, 4).map((version) => (
              <div key={version.id} className="bg-muted/30 rounded-md p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">v{version.versionNumber ?? "?"}</span>
                    <Badge variant="outline">{displayStatus(version.status)}</Badge>
                  </div>
                  <span className="text-muted-foreground font-mono text-xs" title={version.configHash}>
                    {shortHash(version.configHash)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {version.releaseNote || "无发布说明"} · {formatDate(version.createdAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(version.dependencies ?? []).length === 0 ? (
                    <span className="text-muted-foreground text-xs">无外部依赖</span>
                  ) : (
                    version.dependencies?.map((dependency, index) => (
                      <Badge
                        key={`${dependency.dependencyType}-${dependency.dependencyId}-${index}`}
                        variant="secondary"
                      >
                        {dependency.dependencyType ?? "依赖"} · 引用已锁定
                      </Badge>
                    ))
                  )}
                  <Badge variant="outline">差异 {(version.diff ?? []).length} 项</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="border-border rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          <h3 className="text-sm font-semibold">灰度与回滚保护</h3>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled title="只读验收区不执行真实发布">
            提交生产审批
          </Button>
          <Button size="sm" variant="outline" disabled title="需通过评测门禁与审批">
            启动测试 cohort 灰度
          </Button>
          <Button size="sm" variant="destructive" disabled title="需授权操作员与有效回滚目标">
            回滚生产版本
          </Button>
        </div>
        <ul className="text-muted-foreground mt-3 space-y-1 text-xs">
          {(blockedReasons.length ? blockedReasons : ["所有门禁已满足；本页当前为安全只读视图"]).map(
            (reason) => (
              <li key={reason}>• {reason}</li>
            ),
          )}
          <li>• 过期 revision 会被拒绝；相同幂等键不会创建重复回滚记录</li>
        </ul>
      </section>
    </div>
  );
}
