import { useDocumentHead } from "@buildingai/hooks";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@buildingai/ui/components/ui/card";
import {
  CheckCircle2,
  CircleAlert,
  Database,
  FlaskConical,
  LockKeyhole,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { PageContainer } from "@/layouts/console/_components/page-container";

type EvaluationRun = {
  id: string;
  dataset: string;
  version: string;
  status: "passed" | "running" | "blocked";
  progress: string;
  updatedAt: string;
};

const runs: EvaluationRun[] = [
  {
    id: "baseline-2026-08-31",
    dataset: "平台黄金集",
    version: "v2026.08.31",
    status: "passed",
    progress: "120/120 cases",
    updatedAt: "2026-08-31 10:24",
  },
  {
    id: "regression-2026-08-31",
    dataset: "红队安全集",
    version: "v2026.08.31",
    status: "blocked",
    progress: "87/100 cases",
    updatedAt: "2026-08-31 10:18",
  },
];

const readinessChecks = [
  { label: "质量与安全门禁证据", status: "通过", ok: true },
  { label: "可观测性与 SLO", status: "通过", ok: true },
  { label: "依赖健康与队列恢复", status: "待补证据", ok: false },
  { label: "备份恢复与回滚演练", status: "待补证据", ok: false },
];

const statusLabel: Record<EvaluationRun["status"], string> = {
  passed: "门禁通过",
  running: "运行中",
  blocked: "门禁阻断",
};

export default function EvaluationDashboardPage() {
  const [lastRefresh, setLastRefresh] = useState(() => new Date().toLocaleTimeString());
  const [demoRuns, setDemoRuns] = useState<EvaluationRun[]>(runs);
  const [selectedRunId, setSelectedRunId] = useState(runs[1]?.id ?? runs[0]?.id ?? "");
  const [demoMessage, setDemoMessage] = useState("所有操作仅更新当前页面，用于验收流程，不会触发真实评估任务。");
  useDocumentHead({ title: "评估与生产就绪" });

  const selectedRun = demoRuns.find((run) => run.id === selectedRunId);

  const createIsolatedRun = () => {
    const id = `isolated-demo-${Date.now()}`;
    const nextRun: EvaluationRun = {
      id,
      dataset: "平台黄金集（隔离演示）",
      version: "v2026.08.31",
      status: "running",
      progress: "0/10 cases",
      updatedAt: new Date().toLocaleString(),
    };
    setDemoRuns((current) => [nextRun, ...current]);
    setSelectedRunId(id);
    setDemoMessage("已创建本地隔离运行：网络副作用已禁用，运行数据不会提交到服务端。");
  };

  const resumeSelectedRun = () => {
    if (!selectedRun) {
      setDemoMessage("请先选择一个运行记录。");
      return;
    }
    if (selectedRun.status !== "blocked") {
      setDemoMessage("仅允许恢复被阻断的运行；未完成或运行中的任务不会被重复启动。");
      return;
    }
    setDemoRuns((current) =>
      current.map((run) =>
        run.id === selectedRun.id
          ? { ...run, status: "running", updatedAt: new Date().toLocaleString() }
          : run,
      ),
    );
    setDemoMessage("已恢复该隔离运行（本地演示），实际生产恢复前仍需重新通过门禁。");
  };

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">评估与生产就绪</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            管理租户隔离的评估数据集、可复现运行、质量安全门禁和上线前就绪证据。
          </p>
        </div>
        <Button variant="outline" onClick={() => setLastRefresh(new Date().toLocaleTimeString())}>
          <RefreshCw className="mr-2 size-4" />
          刷新
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <Database className="text-muted-foreground mb-2 size-5" />
            <div className="text-muted-foreground text-sm">评估数据集</div>
            <div className="text-2xl font-semibold">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <FlaskConical className="text-muted-foreground mb-2 size-5" />
            <div className="text-muted-foreground text-sm">近期开跑</div>
            <div className="text-2xl font-semibold">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <ShieldCheck className="text-muted-foreground mb-2 size-5" />
            <div className="text-muted-foreground text-sm">门禁通过率</div>
            <div className="text-2xl font-semibold">50%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <CircleAlert className="text-muted-foreground mb-2 size-5" />
            <div className="text-muted-foreground text-sm">待补就绪证据</div>
            <div className="text-2xl font-semibold">2</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>评估数据集与运行状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">运行 ID</th>
                  <th className="p-2">数据集</th>
                  <th className="p-2">版本</th>
                  <th className="p-2">进度</th>
                  <th className="p-2">状态</th>
                  <th className="p-2">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {demoRuns.map((run) => (
                  <tr
                    className={`border-b ${selectedRunId === run.id ? "bg-muted/50" : ""}`}
                    key={run.id}
                    onClick={() => setSelectedRunId(run.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedRunId(run.id);
                    }}
                  >
                    <td className="p-2 font-mono text-xs">{run.id}</td>
                    <td className="p-2">{run.dataset}</td>
                    <td className="p-2">{run.version}</td>
                    <td className="p-2">{run.progress}</td>
                    <td className="p-2">
                      <Badge variant={run.status === "passed" ? "default" : "destructive"}>
                        {statusLabel[run.status]}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground p-2">{run.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            数据按当前租户与项目范围展示；刷新时间 {lastRefresh}。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>隔离运行控制（浏览器演示）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border-border flex items-center gap-2 rounded-md border p-3">
              <LockKeyhole className="size-4 text-emerald-600" />
              <div>
                <div className="text-sm font-medium">网络副作用</div>
                <div className="text-muted-foreground text-xs">已隔离（只读演示）</div>
              </div>
            </div>
            <div className="border-border flex items-center gap-2 rounded-md border p-3">
              <ShieldCheck className="size-4 text-emerald-600" />
              <div>
                <div className="text-sm font-medium">受限案例</div>
                <div className="text-muted-foreground text-xs">红队集 / PII 脱敏</div>
              </div>
            </div>
            <div className="border-border flex items-center gap-2 rounded-md border p-3">
              <FlaskConical className="size-4 text-sky-600" />
              <div>
                <div className="text-sm font-medium">当前选择</div>
                <div className="text-muted-foreground truncate text-xs">{selectedRun?.id ?? "无"}</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={createIsolatedRun}>
              <PlayCircle className="mr-2 size-4" />
              创建隔离运行
            </Button>
            <Button onClick={resumeSelectedRun} variant="outline" disabled={!selectedRun}>
              <RefreshCw className="mr-2 size-4" />
              恢复选中运行
            </Button>
          </div>
          <p className="text-muted-foreground text-xs" role="status">
            {demoMessage}
          </p>
          <p className="text-muted-foreground text-xs">
            安全规则：运行中的任务不可重复启动；只有“门禁阻断”记录允许恢复，恢复后必须重新执行质量、安全和依赖门禁。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>生产就绪门禁</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {readinessChecks.map((check) => (
            <div
              className="border-border flex items-center justify-between rounded-md border p-3"
              key={check.label}
            >
              <div className="flex items-center gap-2">
                {check.ok ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <CircleAlert className="size-4 text-amber-600" />
                )}
                <span className="text-sm">{check.label}</span>
              </div>
              <Badge variant={check.ok ? "secondary" : "outline"}>{check.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
