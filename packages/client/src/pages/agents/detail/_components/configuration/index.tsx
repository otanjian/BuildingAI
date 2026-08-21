import { useDocumentHead } from "@buildingai/hooks";
import {
  updateAgentConfig,
  updateAgentSensitiveWordConfig,
  useAgentDetailQuery,
  useAiProvidersQuery,
  usePublishAgentToSquareMutation,
  useUnpublishAgentFromSquareMutation,
} from "@buildingai/services/web";
import type {
  AnnotationConfig,
  ModelRouting,
  SensitiveWordConfig,
  ThirdPartyIntegrationConfig,
  VoiceConfig,
} from "@buildingai/types";
import { EditorDndScope } from "@buildingai/ui/components/editor";
import { Button } from "@buildingai/ui/components/ui/button";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { TooltipProvider } from "@buildingai/ui/components/ui/tooltip";
import { projectSensitiveWordRichText } from "@buildingai/utils/sensitive-word-config";
import { ArrowBigUp, Loader2, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useParams } from "react-router-dom";
import { toast } from "sonner";

import OrchestrationLayout from "../../_layouts";
import DebuggingPreview from "./debugging";
import {
  AgentFeatures,
  ContextSettings,
  FormVariables,
  KnowledgeBase,
  McpTools,
  RolePrompt,
  ThirdPartyIntegration,
} from "./function";
import {
  AutoFollowUp,
  ChatAvatar,
  QuickCommands,
  SensitiveWordFilterConfig,
  StarterQuestions,
  WelcomeMessage,
} from "./interface";
import {
  buildSensitiveWordRequest,
  hydrateSensitiveWordDraft,
} from "./interface/sensitive-word-draft";
import {
  createSensitiveWordSaveQueue,
  reconcileSensitiveWordSave,
} from "./interface/sensitive-word-save-queue";
import { ModelSelector, VoiceConfigDefaultsSync, VoiceConfigSelector } from "./model";
import { PublishDialog } from "./publish-dialog";

type QuickCommandState = {
  avatar?: string;
  name: string;
  content: string;
  replyType: "custom" | "model";
  replyContent?: string;
};

type FormFieldConfig = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  maxLength?: number;
  options?: string[] | Array<{ label: string; value: string }>;
};

type AutoQuestionsState = {
  enabled: boolean;
  customRuleEnabled: boolean;
  customRule: string;
};

type ToolConfigState = {
  requireApproval?: boolean;
  toolTimeout?: number;
} | null;

type ConfigState = {
  rolePrompt: string;
  formFields: any[];
  openingStatement: string;
  openingQuestions: string[];
  autoQuestions: AutoQuestionsState;
  quickCommands: QuickCommandState[];
  chatAvatar: string;
  chatAvatarEnabled: boolean;
  datasetIds: string[];
  mcpServerIds: string[];
  toolConfig: ToolConfigState;
  showContext: boolean;
  showReference: boolean;
  annotationConfig: AnnotationConfig | null;
  sensitiveWordConfig: SensitiveWordConfig | null;
  enableWebSearch: boolean;
  enableFileUpload: boolean;
  maxSteps: number;
  modelConfig: { id?: string };
  modelRouting: ModelRouting | null;
  memoryConfig: { maxUserMemories?: number; maxAgentMemories?: number } | null;
  voiceConfig: VoiceConfig | null;
  thirdPartyIntegration: ThirdPartyIntegrationConfig | null;
};

const getDefaultConfig = (): ConfigState => ({
  rolePrompt: "",
  formFields: [],
  openingStatement: "",
  openingQuestions: [],
  autoQuestions: {
    enabled: false,
    customRuleEnabled: false,
    customRule: "",
  },
  quickCommands: [],
  chatAvatar: "",
  chatAvatarEnabled: false,
  datasetIds: [],
  mcpServerIds: [],
  toolConfig: null,
  showContext: true,
  showReference: true,
  annotationConfig: null,
  sensitiveWordConfig: null,
  enableWebSearch: false,
  enableFileUpload: false,
  maxSteps: 10,
  modelConfig: {},
  modelRouting: null,
  memoryConfig: null,
  voiceConfig: null,
  thirdPartyIntegration: null,
});

type FormVariableType = "text" | "paragraph" | "select" | "number";

type FormVariable = {
  id: string;
  type: FormVariableType;
  name: string;
  label: string;
  maxLength?: number;
  required: boolean;
  options?: Array<{ id: string; label: string }>;
};

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function toApiFormFields(input: any[]): FormFieldConfig[] {
  if (!Array.isArray(input) || input.length === 0) return [];

  return input
    .map((raw): FormFieldConfig | null => {
      const item = raw as Partial<FormVariable>;
      const name = String(item.name ?? "").trim();
      const label = String(item.label ?? "").trim();
      const type = item.type;
      if (!name || !label || !type) return null;

      if (type === "select") {
        const options = (item.options ?? ([] as Array<{ id: string; label: string }>))
          .map((x) => String(x.label ?? "").trim())
          .filter(Boolean)
          .map((v) => ({ label: v, value: v }));

        return {
          name,
          label,
          type: "select",
          required: !!item.required,
          options: options.length ? options : undefined,
        };
      }

      const mappedType: "text" | "textarea" = type === "paragraph" ? "textarea" : "text";
      const maxLength =
        mappedType === "text" || mappedType === "textarea"
          ? typeof item.maxLength === "number" && Number.isFinite(item.maxLength)
            ? item.maxLength
            : undefined
          : undefined;

      return {
        name,
        label,
        type: mappedType,
        required: !!item.required,
        maxLength,
      };
    })
    .filter((x): x is FormFieldConfig => Boolean(x));
}

function fromApiFormFields(input: unknown): FormVariable[] {
  if (!Array.isArray(input) || input.length === 0) return [];

  return (input as FormFieldConfig[])
    .map((f): FormVariable | null => {
      const name = String(f.name ?? "").trim();
      const label = String(f.label ?? "").trim();
      if (!name || !label) return null;

      if (f.type === "select") {
        const opts = Array.isArray(f.options)
          ? f.options.map((x: string | { label: string; value: string }) => {
              if (typeof x === "string") return x;
              return String(x.label ?? "").trim();
            })
          : [];

        return {
          id: createId(),
          type: "select",
          name,
          label,
          required: !!f.required,
          options: opts.filter(Boolean).map((t: string) => ({ id: createId(), label: t })),
        };
      }

      return {
        id: createId(),
        type: f.type === "textarea" ? "paragraph" : "text",
        name,
        label,
        required: !!f.required,
        maxLength: typeof f.maxLength === "number" ? f.maxLength : undefined,
      };
    })
    .filter((x): x is FormVariable => Boolean(x));
}

export default function Configuration() {
  const { id } = useParams();
  const agentId = id ?? "";
  const activeAgentIdRef = useRef(agentId);
  activeAgentIdRef.current = agentId;
  const { data: agent, refetch: refetchAgentDetail } = useAgentDetailQuery(id, {
    refetchOnWindowFocus: false,
  });

  useDocumentHead({
    title: agent?.name || "智能体配置",
  });

  const [autoSave] = useState(true);
  const [config, setConfig] = useState<ConfigState>(() => getDefaultConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const hydratedRef = useRef(false);
  const hydratedAgentIdRef = useRef("");
  const skipNextAutoSaveRef = useRef(false);
  const saveConfigRef = useRef<(next: ConfigState) => Promise<void>>(null!);
  const sensitiveSaveQueueRef = useRef(createSensitiveWordSaveQueue());
  const flushSensitiveSaveRef = useRef<() => Promise<boolean>>(async () => true);
  const sensitiveEditVersionRef = useRef(0);
  const acknowledgedSensitiveRef = useRef<SensitiveWordConfig | null>(null);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [sensitiveSaveError, setSensitiveSaveError] = useState(false);
  const [sensitiveDirty, setSensitiveDirty] = useState(false);
  const navigationBlocker = useBlocker(sensitiveDirty);

  const createMode = agent?.createMode ?? "direct";
  const isThirdPartyMode =
    createMode === "coze" || createMode === "dify" || createMode === "opencode";

  const createConfigFromAgent = useCallback(
    (currentAgent: NonNullable<typeof agent>): ConfigState => ({
      rolePrompt: currentAgent.rolePrompt ?? "",
      formFields: fromApiFormFields(currentAgent.formFields),
      openingStatement: currentAgent.openingStatement ?? "",
      openingQuestions: currentAgent.openingQuestions ?? [],
      autoQuestions: {
        enabled: currentAgent.autoQuestions?.enabled ?? false,
        customRuleEnabled: currentAgent.autoQuestions?.customRuleEnabled ?? false,
        customRule: currentAgent.autoQuestions?.customRule ?? "",
      },
      quickCommands: currentAgent.quickCommands ?? [],
      chatAvatar: currentAgent.chatAvatar ?? "",
      chatAvatarEnabled: currentAgent.chatAvatarEnabled ?? false,
      datasetIds: currentAgent.datasetIds ?? [],
      mcpServerIds: currentAgent.mcpServerIds ?? [],
      toolConfig: currentAgent.toolConfig ?? null,
      showContext: currentAgent.showContext ?? true,
      showReference: currentAgent.showReference ?? true,
      annotationConfig: currentAgent.annotationConfig ?? null,
      sensitiveWordConfig: (currentAgent.sensitiveWordConfig as SensitiveWordConfig) ?? null,
      enableWebSearch: currentAgent.enableWebSearch ?? false,
      enableFileUpload: currentAgent.enableFileUpload ?? false,
      maxSteps: (currentAgent.maxSteps as number) ?? 10,
      modelConfig: { id: currentAgent.modelConfig?.id },
      modelRouting: (currentAgent.modelRouting as ModelRouting) ?? null,
      memoryConfig: currentAgent.memoryConfig ?? null,
      voiceConfig: (currentAgent.voiceConfig as VoiceConfig) ?? null,
      thirdPartyIntegration:
        (currentAgent.thirdPartyIntegration as ThirdPartyIntegrationConfig) ?? null,
    }),
    [],
  );

  const updateConfig = useCallback(<K extends keyof ConfigState>(key: K, value: ConfigState[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<ConfigState>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveConfig = useCallback(
    async (next: ConfigState) => {
      if (!agentId) return;
      const capturedAgentId = agentId;
      setIsSaving(true);

      setSaveError(false);
      try {
        const payload: Record<string, unknown> = {
          rolePrompt: next.rolePrompt,
          formFields: toApiFormFields(next.formFields),
          openingStatement: next.openingStatement,
          openingQuestions: next.openingQuestions,
          autoQuestions: {
            enabled: next.autoQuestions.enabled,
            customRuleEnabled: next.autoQuestions.customRuleEnabled,
            customRule: next.autoQuestions.customRuleEnabled
              ? next.autoQuestions.customRule
              : undefined,
          },
          quickCommands: next.quickCommands.map((x) => ({
            avatar: x.avatar ?? "",
            name: x.name,
            content: x.content,
            replyType: x.replyType,
            replyContent: x.replyContent ?? "",
          })),
          chatAvatar: next.chatAvatar,
          datasetIds: next.datasetIds,
          mcpServerIds: next.mcpServerIds,
          toolConfig: next.toolConfig ?? null,
          showContext: next.showContext,
          showReference: next.showReference,
          annotationConfig: next.annotationConfig ?? null,
          enableWebSearch: next.enableWebSearch,
          enableFileUpload: next.enableFileUpload,
          chatAvatarEnabled: next.chatAvatarEnabled,
          maxSteps: next.maxSteps,
          modelConfig: next.modelConfig,
          modelRouting: next.modelRouting ?? null,
          memoryConfig: next.memoryConfig ?? null,
          voiceConfig: next.voiceConfig ?? null,
        };

        if (
          agent?.createMode === "coze" ||
          agent?.createMode === "dify" ||
          agent?.createMode === "opencode"
        ) {
          payload.thirdPartyIntegration = next.thirdPartyIntegration ?? undefined;
        }

        const savedAgent = await updateAgentConfig(capturedAgentId, payload as any);
        const extConfig = (savedAgent?.thirdPartyIntegration as any)?.extendedConfig;

        if (
          agent?.createMode === "coze" &&
          extConfig?.cozeSyncStatus === "failed" &&
          extConfig?.cozeSyncError
        ) {
          toast.error(`${extConfig.cozeSyncError}`);
        }
        if (
          agent?.createMode === "dify" &&
          extConfig?.difySyncStatus === "failed" &&
          extConfig?.difySyncError
        ) {
          toast.error(`${extConfig.difySyncError}`);
        }

        if (
          savedAgent?.createMode === "coze" ||
          savedAgent?.createMode === "dify" ||
          savedAgent?.createMode === "opencode"
        ) {
          const refreshedAgentResult = await refetchAgentDetail();
          const latestAgent =
            !refreshedAgentResult.error && refreshedAgentResult.data
              ? refreshedAgentResult.data
              : savedAgent;

          if (latestAgent) {
            if (capturedAgentId !== activeAgentIdRef.current) return;
            skipNextAutoSaveRef.current = true;
            setConfig((current) => ({
              ...createConfigFromAgent(latestAgent),
              sensitiveWordConfig: current.sensitiveWordConfig,
            }));
          }
        } else {
          if (capturedAgentId === activeAgentIdRef.current) void refetchAgentDetail();
        }

        if (capturedAgentId === activeAgentIdRef.current) setLastSavedAt(new Date());
      } catch (error) {
        if (capturedAgentId === activeAgentIdRef.current) setSaveError(true);
        console.error("Failed to save agent config:", error);
      } finally {
        if (capturedAgentId === activeAgentIdRef.current) setIsSaving(false);
      }
    },
    [agentId, agent?.createMode, createConfigFromAgent, refetchAgentDetail],
  );

  saveConfigRef.current = saveConfig;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formFieldsForDebug = useMemo(() => config.formFields, [config.formFields]);
  const openingStatementForDebug = useMemo(() => {
    const draft = hydrateSensitiveWordDraft(config.sensitiveWordConfig);
    const validation = buildSensitiveWordRequest(draft);
    const previewConfig = validation.request
      ? config.sensitiveWordConfig
      : {
          ...acknowledgedSensitiveRef.current,
          enabled: draft.enabled,
          applyToReasoning: draft.applyToReasoning,
        };
    return projectSensitiveWordRichText(config.openingStatement, previewConfig);
  }, [config.openingStatement, config.sensitiveWordConfig]);

  const { data: providers = [] } = useAiProvidersQuery({ supportedModelTypes: "llm" });
  const publishSquareMutation = usePublishAgentToSquareMutation(agentId);
  const unpublishSquareMutation = useUnpublishAgentFromSquareMutation(agentId);
  const chatModelFeatures = useMemo(() => {
    const modelId = config.modelConfig?.id;
    if (modelId == null || modelId === "" || !providers.length) return [];
    const idStr = String(modelId);
    for (const p of providers) {
      const m = p.models?.find((x) => String(x.id) === idStr);
      if (m) return m.features ?? [];
    }
    return [];
  }, [providers, config.modelConfig?.id]);
  const chatModelThinkingSupported = useMemo(() => {
    const modelId = config.modelConfig?.id;
    if (modelId == null || modelId === "" || !providers.length) return false;
    const idStr = String(modelId);
    for (const p of providers) {
      const m = p.models?.find((x) => String(x.id) === idStr);
      if (m) return m.thinking ?? false;
    }
    return false;
  }, [providers, config.modelConfig?.id]);

  useEffect(() => {
    if (!agent || agent.id !== agentId || hydratedAgentIdRef.current === agentId) return;
    setConfig(createConfigFromAgent(agent));
    acknowledgedSensitiveRef.current =
      (agent.sensitiveWordConfig as SensitiveWordConfig | null | undefined) ?? null;
    hydratedRef.current = true;
    hydratedAgentIdRef.current = agentId;
    sensitiveEditVersionRef.current = 0;
    setSensitiveDirty(false);
  }, [agent, agentId, createConfigFromAgent]);

  useEffect(() => {
    if (
      !hydratedRef.current ||
      hydratedAgentIdRef.current !== agentId ||
      !agentId ||
      !config.sensitiveWordConfig ||
      !sensitiveDirty
    ) {
      flushSensitiveSaveRef.current = async () => true;
      return;
    }
    const draft = hydrateSensitiveWordDraft(config.sensitiveWordConfig);
    flushSensitiveSaveRef.current = async () => false;
    const requestResult = buildSensitiveWordRequest(draft);
    const acknowledged = hydrateSensitiveWordDraft(acknowledgedSensitiveRef.current);
    const switchOnlyDraft =
      draft.enabled !== acknowledged.enabled ||
      draft.applyToReasoning !== acknowledged.applyToReasoning
        ? { ...draft, rules: acknowledged.rules }
        : draft;
    const saveResult = requestResult.request
      ? requestResult
      : draft.enabled !== acknowledged.enabled ||
          draft.applyToReasoning !== acknowledged.applyToReasoning
        ? buildSensitiveWordRequest(switchOnlyDraft)
        : requestResult;
    if (!saveResult.request) return;
    if (
      JSON.stringify({ ...draft, revision: acknowledged.revision }) === JSON.stringify(acknowledged)
    ) {
      setSensitiveDirty(false);
      flushSensitiveSaveRef.current = async () => true;
      return;
    }

    const capturedAgentId = agentId;
    const capturedEditVersion = sensitiveEditVersionRef.current;
    let flushPromise: Promise<boolean> | null = null;
    const flush = () => {
      if (flushPromise) return flushPromise;
      flushPromise = sensitiveSaveQueueRef.current
        .enqueue(`${capturedAgentId}:${capturedEditVersion}`, async () => {
          let savedCurrentDraft = false;
          const latestAcknowledged = hydrateSensitiveWordDraft(acknowledgedSensitiveRef.current);
          const latestDraft = hydrateSensitiveWordDraft(config.sensitiveWordConfig);
          const switchChanged =
            latestDraft.enabled !== latestAcknowledged.enabled ||
            latestDraft.applyToReasoning !== latestAcknowledged.applyToReasoning;
          const latestValidation = buildSensitiveWordRequest({
            ...latestDraft,
            revision: latestAcknowledged.revision,
          });
          const latestRequest = latestValidation.request
            ? latestValidation
            : switchChanged
              ? buildSensitiveWordRequest({
                  ...latestDraft,
                  revision: latestAcknowledged.revision,
                  rules: latestAcknowledged.rules,
                })
              : latestValidation;
          if (!latestRequest.request) return;
          const savedRules = latestValidation.request
            ? latestDraft.rules
            : latestAcknowledged.rules;
          const keptInvalidDraft = !latestValidation.request && switchChanged;
          const saved = await updateAgentSensitiveWordConfig(
            capturedAgentId,
            latestRequest.request,
          );
          if (capturedAgentId === activeAgentIdRef.current) {
            acknowledgedSensitiveRef.current = saved;
            savedCurrentDraft = capturedEditVersion === sensitiveEditVersionRef.current;
            if (savedCurrentDraft && !keptInvalidDraft) setSensitiveDirty(false);
            setConfig((current) => ({
              ...current,
              sensitiveWordConfig: reconcileSensitiveWordSave({
                current: current.sensitiveWordConfig,
                saved,
                savedRules,
                isCurrentEdit: savedCurrentDraft,
                keepInvalidDraft: keptInvalidDraft,
              }),
            }));
            setLastSavedAt(new Date());
            setSensitiveSaveError(false);
          }
          savedCurrentDraft = savedCurrentDraft && !keptInvalidDraft;
          return savedCurrentDraft;
        })
        .catch((error) => {
          if (capturedAgentId === activeAgentIdRef.current) {
            setSensitiveSaveError(true);
            setSensitiveDirty(true);
          }
          console.error("Failed to save sensitive word config:", error);
          return false;
        });
      return flushPromise;
    };
    flushSensitiveSaveRef.current = flush;
    const timer = window.setTimeout(() => void flush(), 800);
    return () => window.clearTimeout(timer);
  }, [agentId, config.sensitiveWordConfig, sensitiveDirty]);

  useEffect(() => {
    if (navigationBlocker.state !== "blocked") return;
    void flushSensitiveSaveRef.current().then((saved) => {
      if (saved) {
        navigationBlocker.proceed();
        return;
      }
      const discard = window.confirm("敏感词替换尚未保存。是否放弃本次修改并离开？");
      if (discard) {
        setSensitiveDirty(false);
        navigationBlocker.proceed();
      } else {
        navigationBlocker.reset();
      }
    });
  }, [navigationBlocker, sensitiveDirty]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const acknowledged = hydrateSensitiveWordDraft(acknowledgedSensitiveRef.current);
      const draft = hydrateSensitiveWordDraft(config.sensitiveWordConfig);
      if (
        !sensitiveDirty &&
        JSON.stringify({ ...draft, revision: acknowledged.revision }) ===
          JSON.stringify(acknowledged)
      ) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [config.sensitiveWordConfig, sensitiveDirty]);

  const generalConfigFingerprint = useMemo(() => {
    const { sensitiveWordConfig: _sensitiveWordConfig, ...generalConfig } = config;
    return JSON.stringify(generalConfig);
  }, [config]);

  useEffect(() => {
    if (!autoSave) return;
    if (!hydratedRef.current || hydratedAgentIdRef.current !== agentId) return;
    if (!agentId) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      void saveConfigRef.current(config);
    }, 800);
    return () => window.clearTimeout(t);
    // Sensitive-word changes have their own revisioned endpoint and save queue.
  }, [agentId, autoSave, generalConfigFingerprint]);

  const publishLoading = publishSquareMutation.isPending || unpublishSquareMutation.isPending;

  const reloadSensitiveWordConfig = useCallback(async () => {
    const capturedAgentId = agentId;
    const result = await refetchAgentDetail();
    if (
      result.error ||
      !result.data ||
      capturedAgentId !== activeAgentIdRef.current ||
      result.data.id !== capturedAgentId
    ) {
      setSensitiveSaveError(true);
      return;
    }
    const reloaded =
      (result.data.sensitiveWordConfig as SensitiveWordConfig | null | undefined) ?? null;
    acknowledgedSensitiveRef.current = reloaded;
    sensitiveEditVersionRef.current += 1;
    setConfig((current) => ({ ...current, sensitiveWordConfig: reloaded }));
    setSensitiveDirty(false);
    setSensitiveSaveError(false);
  }, [agentId, refetchAgentDetail]);

  const handleConfirmSquarePublish = useCallback(
    async (publishToSquare: boolean, tagIds?: string[], allowCopy?: boolean) => {
      try {
        if (publishToSquare) {
          const updatedAgent = await publishSquareMutation.mutateAsync({
            tagIds: tagIds ?? [],
            allowCopy,
          });

          if (agent?.publishedToSquare && agent?.squarePublishStatus === "approved") {
            toast.success("发布设置已更新");
            setPublishDialogOpen(false);
            return;
          }
          toast.success(
            updatedAgent.squarePublishStatus === "approved" ? "已发布到广场" : "已提交广场审核",
          );
        } else {
          await unpublishSquareMutation.mutateAsync();
          toast.success("已撤回广场发布");
        }
        setPublishDialogOpen(false);
      } catch (error) {
        console.error(`操作失败: ${(error as Error).message}`);
      }
    },
    [
      agent?.publishedToSquare,
      agent?.squarePublishStatus,
      publishSquareMutation,
      unpublishSquareMutation,
    ],
  );

  return (
    <div className="relative h-dvh w-dvw">
      <VoiceConfigDefaultsSync
        voiceConfig={config.voiceConfig}
        onSync={(v) => updateConfig("voiceConfig", v)}
      />
      <OrchestrationLayout>
        <Tabs defaultValue="function" className="flex h-full min-h-0 flex-col gap-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <h1 className="shrink-0 text-lg font-semibold">编排</h1>
              <TabsList className="shrink-0">
                <TabsTrigger value="function">功能配置</TabsTrigger>
                <TabsTrigger value="interface">界面配置</TabsTrigger>
                {!isThirdPartyMode && <TabsTrigger value="model">模型配置</TabsTrigger>}
              </TabsList>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  {isSaving && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>保存中...</span>
                    </>
                  )}

                  {!isSaving && (saveError || sensitiveSaveError) && (
                    <span className="text-red-500">保存失败</span>
                  )}

                  {!isSaving && !saveError && !sensitiveSaveError && lastSavedAt && (
                    <span>草稿已保存于 {formatTime(lastSavedAt)}</span>
                  )}
                </div>
              </div>

              <Button
                variant={agent?.squarePublishStatus === "rejected" ? "destructive" : "default"}
                onClick={() => setPublishDialogOpen(true)}
                disabled={!agentId}
              >
                <span>{agent?.squarePublishStatus === "rejected" ? "审核失败" : "发布到广场"}</span>
                {agent?.squarePublishStatus === "rejected" ? <RefreshCcw /> : <ArrowBigUp />}
              </Button>
            </div>
          </div>

          <div className="grid h-full min-h-0 grid-cols-2 gap-4 pt-px pl-3">
            <div className="flex h-full min-h-0 flex-col pb-4">
              <TabsContent
                value="function"
                className="chat-scroll mt-0 flex h-full min-h-0 flex-col"
              >
                <TooltipProvider>
                  <div className="space-y-4">
                    {isThirdPartyMode ? (
                      <>
                        <ThirdPartyIntegration
                          mode={createMode as "coze" | "dify" | "opencode"}
                          value={config.thirdPartyIntegration as any}
                          onChange={(v: any) => updateConfig("thirdPartyIntegration", v)}
                        />
                        <div className="bg-secondary flex items-center justify-between rounded-lg px-3 py-2.5">
                          <div className="flex flex-col">
                            <h3 className="text-sm font-medium">文件上传</h3>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              开启后用户可在对话中上传图片与文件
                            </p>
                          </div>
                          <Switch
                            checked={config.enableFileUpload}
                            onCheckedChange={(checked) =>
                              updateMultiple({ enableFileUpload: checked })
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <RolePrompt
                          value={config.rolePrompt}
                          formFields={config.formFields}
                          onChange={(v) => updateConfig("rolePrompt", v)}
                        />
                        <FormVariables
                          value={config.formFields}
                          onChange={(v) => updateConfig("formFields", v)}
                        />
                        <KnowledgeBase
                          value={config.datasetIds}
                          onChange={(v) => updateConfig("datasetIds", v)}
                        />
                        <ContextSettings
                          showContext={config.showContext}
                          showReference={config.showReference}
                          annotationConfig={config.annotationConfig}
                          enableFileUpload={config.enableFileUpload}
                          onChange={updateMultiple}
                        />
                        <McpTools
                          value={config.mcpServerIds}
                          onChange={(v) => updateConfig("mcpServerIds", v)}
                          toolConfig={config.toolConfig}
                          onToolConfigChange={(v) => updateConfig("toolConfig", v)}
                        />
                        <AgentFeatures maxSteps={config.maxSteps} onChange={updateMultiple} />
                      </>
                    )}
                  </div>
                </TooltipProvider>
              </TabsContent>

              <TabsContent
                value="interface"
                className="chat-scroll mt-0 flex h-full min-h-0 flex-col"
              >
                <EditorDndScope>
                  <div className="space-y-4">
                    {!isThirdPartyMode && (
                      <>
                        <WelcomeMessage
                          value={config.openingStatement}
                          onChange={(v) => updateConfig("openingStatement", v)}
                        />
                        <StarterQuestions
                          value={config.openingQuestions}
                          onChange={(v) => updateConfig("openingQuestions", v)}
                        />
                        <AutoFollowUp
                          value={config.autoQuestions}
                          onChange={(v) => updateConfig("autoQuestions", v)}
                          titleModelId={config.modelRouting?.titleModel?.modelId}
                          onTitleModelChange={(id) => {
                            const next: ModelRouting = { ...(config.modelRouting ?? {}) };
                            if (id) {
                              next.titleModel = { modelId: id };
                            } else {
                              delete next.titleModel;
                            }
                            updateConfig("modelRouting", next);
                          }}
                        />
                      </>
                    )}
                    <QuickCommands
                      value={config.quickCommands}
                      onChange={(v) => updateConfig("quickCommands", v)}
                    />
                    <SensitiveWordFilterConfig
                      value={config.sensitiveWordConfig}
                      onChange={(v) => {
                        sensitiveEditVersionRef.current += 1;
                        setSensitiveDirty(true);
                        updateConfig("sensitiveWordConfig", v);
                      }}
                    />
                    {sensitiveSaveError && sensitiveDirty ? (
                      <div className="border-destructive/40 bg-destructive/5 flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                        <span>敏感词替换尚未保存，请修正规则或重试。</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfig((current) => ({
                              ...current,
                              sensitiveWordConfig: { ...current.sensitiveWordConfig! },
                            }))
                          }
                        >
                          重试
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void reloadSensitiveWordConfig()}
                        >
                          重新加载
                        </Button>
                      </div>
                    ) : null}
                    <ChatAvatar
                      value={config.chatAvatar}
                      enabled={config.chatAvatarEnabled}
                      onChange={(v) => updateConfig("chatAvatar", v)}
                      onEnabledChange={(enabled) => {
                        updateConfig("chatAvatarEnabled", enabled);
                        if (!enabled) updateConfig("chatAvatar", "");
                      }}
                    />
                  </div>
                </EditorDndScope>
              </TabsContent>

              {!isThirdPartyMode && (
                <TabsContent
                  value="model"
                  className="chat-scroll mt-0 flex h-full min-h-0 flex-col"
                >
                  <TooltipProvider>
                    <div className="space-y-6">
                      <ModelSelector
                        chatModelId={config.modelConfig.id}
                        modelRouting={config.modelRouting}
                        memoryConfig={config.memoryConfig}
                        onChatModelChange={(id) => updateConfig("modelConfig", { id })}
                        onModelRoutingChange={(routing) => updateConfig("modelRouting", routing)}
                        onMemoryConfigChange={(v) => updateConfig("memoryConfig", v)}
                      />
                      <VoiceConfigSelector
                        value={config.voiceConfig}
                        onChange={(v) => updateConfig("voiceConfig", v)}
                      />
                    </div>
                  </TooltipProvider>
                </TabsContent>
              )}
            </div>

            <div className="flex h-full min-h-0 flex-col">
              <DebuggingPreview
                key={config.modelConfig?.id ?? "no-model"}
                agentId={agentId}
                agentName={agent?.name}
                agentAvatar={agent?.avatar ?? undefined}
                annotationEnabled={config.annotationConfig?.enabled ?? false}
                formFields={formFieldsForDebug}
                voiceConfig={config.voiceConfig ?? null}
                showConversationContext={config.showContext}
                showReference={config.showReference}
                openingStatement={openingStatementForDebug}
                openingQuestions={config.openingQuestions}
                quickCommands={config.quickCommands.map((x) => ({
                  name: x.name,
                  content: x.content,
                }))}
                chatAvatarEnabled={config.chatAvatarEnabled}
                chatAvatar={config.chatAvatar || undefined}
                thinkingSupported={chatModelThinkingSupported}
                modelFeatures={chatModelFeatures}
                hiddenTools={config.enableFileUpload ? undefined : ["file"]}
              />
            </div>
          </div>
        </Tabs>
      </OrchestrationLayout>
      <PublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        defaultPublishedToSquare={agent?.publishedToSquare ?? false}
        defaultTagIds={(agent?.tags ?? []).map((t) => t.id)}
        defaultAllowCopy={agent?.publishConfig?.allowCopy === true}
        squarePublishStatus={(agent?.squarePublishStatus as any) ?? "none"}
        squareRejectReason={agent?.squareRejectReason ?? null}
        loading={publishLoading}
        onConfirm={handleConfirmSquarePublish}
      />
    </div>
  );
}
