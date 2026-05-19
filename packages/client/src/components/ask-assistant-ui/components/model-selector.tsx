import { MODEL_FEATURE_DESCRIPTIONS, MODEL_FEATURES } from "@buildingai/ai-sdk/interfaces";
import { useMembershipLevelsQuery } from "@buildingai/services/web";
import { useAiProvidersQuery } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import {
  ModelSelector as AIModelSelector,
  ModelSelectorContent as AIModelSelectorContent,
  ModelSelectorEmpty as AIModelSelectorEmpty,
  ModelSelectorGroup as AIModelSelectorGroup,
  ModelSelectorInput as AIModelSelectorInput,
  ModelSelectorItem as AIModelSelectorItem,
  ModelSelectorList as AIModelSelectorList,
  ModelSelectorName as AIModelSelectorName,
  ModelSelectorTrigger as AIModelSelectorTrigger,
} from "@buildingai/ui/components/ai-elements/model-selector";
import { PromptInputButton as AIPromptInputButton } from "@buildingai/ui/components/ai-elements/prompt-input";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { CommandShortcut } from "@buildingai/ui/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@buildingai/ui/components/ui/tooltip";
import { cn } from "@buildingai/ui/lib/utils";
import {
  Activity,
  Braces,
  Brain,
  CheckIcon,
  ChevronDownIcon,
  FileText,
  LockIcon,
  ScanEye,
  Video,
  Waves,
  Workflow,
  Wrench,
  XIcon,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import { ProviderIcon } from "../../provider-icons";
import { convertProvidersToModels } from "../libs/provider-converter";
import type { Model } from "../types";

function compareProviderGroups(a: ModelData[], b: ModelData[]): number {
  const orderA = a[0]?.providerSortOrder;
  const orderB = b[0]?.providerSortOrder;
  if (orderA != null && orderB != null && orderA !== orderB) {
    return orderB - orderA;
  }
  const createdA = a[0]?.providerCreatedAt;
  const createdB = b[0]?.providerCreatedAt;
  if (createdA && createdB) {
    return new Date(createdB).getTime() - new Date(createdA).getTime();
  }
  const nameA = a[0]?.chef ?? "";
  const nameB = b[0]?.chef ?? "";
  return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
}

const FEATURE_ICON_MAP: Record<string, React.ElementType> = {
  [MODEL_FEATURES.VISION]: ScanEye,
  [MODEL_FEATURES.AUDIO]: Activity,
  [MODEL_FEATURES.DOCUMENT]: FileText,
  [MODEL_FEATURES.VIDEO]: Video,
  [MODEL_FEATURES.AGENT_THOUGHT]: Brain,
  [MODEL_FEATURES.TOOL_CALL]: Wrench,
  [MODEL_FEATURES.MULTI_TOOL_CALL]: Workflow,
  [MODEL_FEATURES.STREAM_TOOL_CALL]: Waves,
  [MODEL_FEATURES.STRUCTURED_OUTPUT]: Braces,
};

export type ModelData = Model;
export type ModelTypeForQuery = "llm" | "text-embedding" | "rerank" | "speech2text" | "tts";
export type ModelSelectorTriggerVariant = "prompt" | "button";

export interface ModelSelectorProps {
  models?: ModelData[];
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  value?: string;
  onSelect?: (modelId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modelType?: ModelTypeForQuery;
  triggerVariant?: ModelSelectorTriggerVariant;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface ModelRowItemProps {
  model: ModelData;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (modelId: string) => void;
  membershipLevels?: { id: string; name: string }[];
}

const ModelRowItem = ({
  model,
  isSelected,
  isDisabled,
  onSelect,
  membershipLevels,
}: ModelRowItemProps) => {
  const features = model.features ?? [];
  const powerText = model.billingRule?.power
    ? `${model.billingRule.power} 积分 / 1K Tokens`
    : "免费";

  const requiredMembershipNames = model.membershipLevel
    ?.map((id) => membershipLevels?.find((level) => level.id === id)?.name)
    .filter(Boolean)
    .join("、");

  const content = (
    <AIModelSelectorItem
      value={model.id}
      keywords={[model.name, model.chef, model.id]}
      disabled={isDisabled}
      onSelect={() => {
        if (!isDisabled) onSelect(model.id);
      }}
      className={cn(isDisabled && "cursor-not-allowed opacity-50")}
    >
      <ProviderIcon provider={model.chefSlug} iconUrl={model.iconUrl} />
      <AIModelSelectorName className="flex items-center">
        <span className="truncate text-left">{model.name}</span>
        <Badge variant="secondary" className="text-muted-foreground ml-1.5 text-xs">
          {powerText}
        </Badge>
      </AIModelSelectorName>
      <div className="ml-auto flex items-center gap-1.5">
        {Object.entries(FEATURE_ICON_MAP).map(([feature, Icon]) =>
          features.includes(feature) ? (
            <Tooltip key={feature}>
              <TooltipTrigger asChild>
                <div>
                  <Icon className="text-muted-foreground size-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {
                    MODEL_FEATURE_DESCRIPTIONS[feature as keyof typeof MODEL_FEATURE_DESCRIPTIONS]
                      ?.name
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          ) : null,
        )}
        {isDisabled ? (
          <LockIcon aria-label="会员专属" className="text-muted-foreground size-3.5" />
        ) : (
          <CommandShortcut>
            {isSelected ? <CheckIcon className="size-4" /> : <div className="size-4" />}
          </CommandShortcut>
        )}
      </div>
    </AIModelSelectorItem>
  );

  if (isDisabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>该模型仅限 {requiredMembershipNames} 使用</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

export const ModelSelector = ({
  models,
  selectedModelId,
  onModelChange,
  value,
  onSelect,
  open,
  onOpenChange,
  modelType,
  triggerVariant = "prompt",
  placeholder = "请选择模型",
  disabled = false,
  className,
}: ModelSelectorProps) => {
  const [innerOpen, setInnerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isOpen = open ?? innerOpen;

  const userMembershipLevelId = useAuthStore((state) => state.auth.userInfo?.membershipLevel?.id);

  const isModelDisabledByMembership = useCallback(
    (model: ModelData): boolean => {
      if (!model.membershipLevel || model.membershipLevel.length === 0) {
        return false;
      }
      if (!userMembershipLevelId || !model.membershipLevel.includes(userMembershipLevelId)) {
        return true;
      }
      return false;
    },
    [userMembershipLevelId],
  );

  const { data: providers = [], isLoading } = useAiProvidersQuery(
    modelType ? { supportedModelTypes: modelType } : undefined,
    { enabled: Boolean(modelType) },
  );
  const { data: membershipLevelsData } = useMembershipLevelsQuery({ enabled: true });
  const resolvedModels = useMemo(
    () => (modelType ? convertProvidersToModels(providers) : (models ?? [])),
    [modelType, models, providers],
  );
  const resolvedSelectedModelId = selectedModelId ?? value ?? "";
  const selectedModel = useMemo(
    () => resolvedModels.find((m) => m.id === resolvedSelectedModelId),
    [resolvedModels, resolvedSelectedModelId],
  );

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (open === undefined) {
        setInnerOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, open],
  );

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  const handleModelSelect = useCallback(
    (modelId: string) => {
      onModelChange?.(modelId);
      onSelect?.(modelId);
      setOpen(false);
    },
    [onModelChange, onSelect, setOpen],
  );

  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredModels = useMemo(() => {
    if (!normalizedQuery) return resolvedModels;
    return resolvedModels.filter((m) => {
      const searchText = `${m.name} ${m.id} ${m.chef}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [resolvedModels, normalizedQuery]);

  const groupedModels = useMemo(() => {
    if (filteredModels.length === 0) return [];

    const byChef = new Map<string, ModelData[]>();
    for (const m of filteredModels) {
      const existing = byChef.get(m.chef);
      if (existing) {
        existing.push(m);
      } else {
        byChef.set(m.chef, [m]);
      }
    }

    return Array.from(byChef.entries())
      .sort(([, modelsA], [, modelsB]) => compareProviderGroups(modelsA, modelsB))
      .map(([chef, models]) => ({ chef, models }));
  }, [filteredModels]);

  return (
    <AIModelSelector open={isOpen} onOpenChange={setOpen}>
      <AIModelSelectorTrigger asChild>
        {triggerVariant === "button" ? (
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled || isLoading}
            className={cn("group flex justify-start gap-1 text-left", className)}
          >
            <span className="min-w-0 flex-1 truncate">
              {isLoading ? "加载中..." : (selectedModel?.name ?? placeholder)}
            </span>
            <span className="relative ml-auto flex size-6 shrink-0 items-center justify-center">
              <ChevronDownIcon
                className={cn(
                  "text-muted-foreground size-4 opacity-50",
                  selectedModel && "group-hover:invisible",
                )}
              />
              {selectedModel && (
                <span
                  role="button"
                  tabIndex={0}
                  className="text-muted-foreground hover:bg-muted absolute inset-0 flex cursor-pointer items-center justify-center rounded opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect?.("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect?.("");
                    }
                  }}
                  aria-label="清除选择"
                >
                  <XIcon className="size-4" />
                </span>
              )}
            </span>
          </Button>
        ) : (
          <AIPromptInputButton>
            {selectedModel?.chefSlug && (
              <ProviderIcon className="size-5" provider={selectedModel.chefSlug} />
            )}
            {selectedModel?.name && (
              <AIModelSelectorName className="flex items-center">
                <span className="truncate text-left">{selectedModel.name}</span>
                <Badge variant="secondary" className="text-muted-foreground ml-1.5 text-xs">
                  {selectedModel.billingRule?.power
                    ? `${selectedModel.billingRule.power} 积分 / 1K Tokens`
                    : "免费"}
                </Badge>
              </AIModelSelectorName>
            )}
            {!selectedModel?.name && <AIModelSelectorName>{placeholder}</AIModelSelectorName>}
            <ChevronDownIcon className="text-muted-foreground size-4" />
          </AIPromptInputButton>
        )}
      </AIModelSelectorTrigger>
      <AIModelSelectorContent>
        <AIModelSelectorInput
          placeholder="Search models..."
          value={query}
          onValueChange={setQuery}
        />

        <AIModelSelectorList>
          {groupedModels.length === 0 ? (
            <AIModelSelectorEmpty>暂无可用的模型</AIModelSelectorEmpty>
          ) : (
            groupedModels.map(({ chef, models: chefModels }) => (
              <AIModelSelectorGroup key={chef} heading={chef}>
                {chefModels.map((model) => (
                  <ModelRowItem
                    key={model.id}
                    model={model}
                    isSelected={resolvedSelectedModelId === model.id}
                    isDisabled={isModelDisabledByMembership(model)}
                    onSelect={handleModelSelect}
                    membershipLevels={membershipLevelsData}
                  />
                ))}
              </AIModelSelectorGroup>
            ))
          )}
        </AIModelSelectorList>
      </AIModelSelectorContent>
    </AIModelSelector>
  );
};
