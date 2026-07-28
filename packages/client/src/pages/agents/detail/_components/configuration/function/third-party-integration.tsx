import type { ThirdPartyIntegrationConfig } from "@buildingai/types";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { memo, useCallback, useMemo } from "react";

type ThirdPartyMode = "coze" | "dify" | "opencode";

type ThirdPartyIntegrationValue = ThirdPartyIntegrationConfig & {
  provider?: ThirdPartyMode;
};

type ThirdPartyIntegrationProps = {
  mode: ThirdPartyMode;
  value: ThirdPartyIntegrationValue | null;
  onChange: (value: ThirdPartyIntegrationValue | null) => void;
};

export const ThirdPartyIntegration = memo(
  ({ mode, value, onChange }: ThirdPartyIntegrationProps) => {
    const config = useMemo<ThirdPartyIntegrationValue>(
      () => ({
        provider: mode,
        appId: value?.appId ?? "",
        apiKey: value?.apiKey ?? "",
        baseURL: value?.baseURL ?? "",
        extendedConfig: value?.extendedConfig,
        variableMapping: value?.variableMapping,
        useExternalConversation: value?.useExternalConversation ?? true,
      }),
      [mode, value],
    );

    const update = useCallback(
      (patch: Partial<ThirdPartyIntegrationValue>) => {
        const botId = mode === "coze" ? (patch.appId ?? config.appId ?? "").trim() : undefined;
        const next: ThirdPartyIntegrationValue = {
          ...config,
          ...patch,
          provider: mode,
          extendedConfig: {
            ...(config.extendedConfig ?? {}),
            ...(patch.extendedConfig ?? {}),
            provider: mode,
            ...(botId ? { botId } : {}),
          },
        };

        const isEmpty =
          mode === "coze"
            ? !next.appId && !next.apiKey && !next.baseURL
            : mode === "opencode"
              ? !next.baseURL && !next.extendedConfig?.workspace
              : !next.apiKey && !next.baseURL;

        onChange(isEmpty ? null : next);
      },
      [config, mode, onChange],
    );

    const title =
      mode === "coze"
        ? "Coze 平台配置"
        : mode === "dify"
          ? "Dify 平台配置"
          : "OpenCode 配置";
    const description =
      mode === "coze"
        ? "配置 Coze Bot 相关参数，系统会从 Coze 获取智能体能力。"
        : mode === "dify"
          ? "配置 Dify 应用相关参数，系统会通过 Dify 提供智能体能力。"
          : "配置本机 OpenCode serve 地址与固定业务仓库；产物按会话写入 artifacts/{conversationId}/。";

    return (
      <div className="bg-secondary rounded-lg px-3 py-2.5">
        <div className="mb-3 flex flex-col gap-0.5">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">BASE URL</Label>
            <Input
              placeholder={
                mode === "coze"
                  ? "留空默认使用 Coze 官方地址，例如：https://api.coze.cn"
                  : mode === "opencode"
                    ? "例如：http://127.0.0.1:4096"
                    : "例如：https://api.dify.ai 或自定义网关地址"
              }
              value={config.baseURL ?? ""}
              className="bg-background"
              onChange={(e) => update({ baseURL: e.target.value.trim() })}
            />
          </div>

          {mode === "coze" && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Bot ID<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                placeholder="请输入 Coze Bot ID"
                value={config.appId ?? ""}
                className="bg-background"
                onChange={(e) => update({ appId: e.target.value.trim() })}
              />
            </div>
          )}

          {mode === "opencode" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Workspace<span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  placeholder="/home/opencodework"
                  value={String(config.extendedConfig?.workspace ?? "")}
                  className="bg-background"
                  onChange={(e) =>
                    update({
                      extendedConfig: {
                        ...(config.extendedConfig ?? {}),
                        workspace: e.target.value.trim(),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Model（可选，provider/model）</Label>
                <Input
                  placeholder="volcengine/ark-code-latest"
                  value={String(config.extendedConfig?.model ?? "")}
                  className="bg-background"
                  onChange={(e) =>
                    update({
                      extendedConfig: {
                        ...(config.extendedConfig ?? {}),
                        model: e.target.value.trim(),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Artifact 目录模板</Label>
                <Input
                  placeholder="artifacts/{conversationId}"
                  value={String(
                    config.extendedConfig?.artifactDirTemplate ?? "artifacts/{conversationId}",
                  )}
                  className="bg-background"
                  onChange={(e) =>
                    update({
                      extendedConfig: {
                        ...(config.extendedConfig ?? {}),
                        artifactDirTemplate: e.target.value.trim(),
                      },
                    })
                  }
                />
              </div>
            </>
          )}

          {mode !== "opencode" && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                API Key<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                type="password"
                placeholder="请输入平台 API Key"
                value={config.apiKey ?? ""}
                className="bg-background"
                autoComplete="new-password"
                onChange={(e) => update({ apiKey: e.target.value.trim() })}
              />
            </div>
          )}

          {mode === "opencode" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Server Password（可选）</Label>
              <Input
                type="password"
                placeholder="OPENCODE_SERVER_PASSWORD，若 serve 未启用可留空"
                value={config.apiKey ?? ""}
                className="bg-background"
                autoComplete="new-password"
                onChange={(e) => update({ apiKey: e.target.value.trim() })}
              />
            </div>
          )}

          {mode !== "opencode" && (
            <div className="bg-background flex items-center justify-between rounded-md px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">使用平台会话管理</span>
                <span className="text-muted-foreground mt-0.5 text-xs">
                  开启后，由第三方平台管理会话上下文，否则由本系统统一管理。
                </span>
              </div>
              <Switch
                checked={config.useExternalConversation ?? true}
                onCheckedChange={(checked) => update({ useExternalConversation: checked })}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

ThirdPartyIntegration.displayName = "ThirdPartyIntegration";
