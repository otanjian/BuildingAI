import type { SensitiveWordConfig, SensitiveWordReplacementRule } from "@buildingai/types";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { validateSensitiveWordRules } from "@buildingai/utils/sensitive-word-config";
import { memo, useRef } from "react";

function getEditableRules(value: SensitiveWordConfig | null): SensitiveWordReplacementRule[] {
  return (
    value?.rules ??
    (value?.words ?? []).map((word) => ({ word, replacement: value?.replacement || "***" }))
  );
}

export const SensitiveWordFilterConfig = memo(
  ({
    value,
    onChange,
  }: {
    value: SensitiveWordConfig | null;
    onChange: (value: SensitiveWordConfig) => void;
  }) => {
    const enabled = value?.enabled ?? false;
    const rules = getEditableRules(value);
    const applyToReasoning = value?.applyToReasoning !== false;
    const latestValueRef = useRef(value);
    latestValueRef.current = value;
    const validation = validateSensitiveWordRules(rules);
    const rowErrors = new Map<number, string[]>();
    for (const error of validation.errors) {
      if (error.index === undefined) continue;
      const messages = rowErrors.get(error.index) ?? [];
      const labels: Record<string, string> = {
        word_blank: "敏感词不能为空",
        word_duplicate: "敏感词重复（英文字母不区分大小写）",
        word_too_long: "敏感词不能超过 128 个字符",
        replacement_too_long: "替换内容不能超过 128 个字符",
      };
      messages.push(labels[error.code] ?? "规则格式不正确");
      rowErrors.set(error.index, messages);
    }

    const patch = (updates: Partial<SensitiveWordConfig>) => {
      const current = latestValueRef.current;
      const next: SensitiveWordConfig = {
        enabled: current?.enabled ?? false,
        applyToReasoning: current?.applyToReasoning !== false,
        revision: current?.revision,
        rules: getEditableRules(current),
        ...updates,
      };
      latestValueRef.current = next;
      onChange(next);
    };

    const patchRule = (index: number, updates: Partial<SensitiveWordReplacementRule>) => {
      const currentRules = getEditableRules(latestValueRef.current);
      patch({
        rules: currentRules.map((rule, current) =>
          current === index ? { ...rule, ...updates } : rule,
        ),
      });
    };

    return (
      <div className="bg-secondary rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">敏感词替换</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              为每个敏感词设置独立替换内容；替换内容留空表示删除匹配文本
            </p>
          </div>
          <Switch
            aria-label="启用敏感词替换"
            checked={enabled}
            onCheckedChange={(checked) => patch({ enabled: checked })}
          />
        </div>

        <div className="mt-3 space-y-3">
          {rules.map((rule, index) => (
            <div key={index} className="space-y-1.5">
              <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <Input
                  aria-label={`敏感词 ${index + 1}`}
                  value={rule.word}
                  onChange={(event) => patchRule(index, { word: event.target.value })}
                  placeholder="敏感词"
                />
                <Input
                  aria-label={`替换内容 ${index + 1}`}
                  value={rule.replacement}
                  onChange={(event) => patchRule(index, { replacement: event.target.value })}
                  placeholder="留空表示删除"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`删除替换规则 ${index + 1}`}
                  onClick={() =>
                    patch({
                      rules: getEditableRules(latestValueRef.current).filter(
                        (_, current) => current !== index,
                      ),
                    })
                  }
                >
                  删除
                </Button>
              </div>
              {rowErrors.get(index)?.map((error) => (
                <p key={error} className="text-destructive text-xs" role="alert">
                  {error}
                </p>
              ))}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rules.length >= 500}
            onClick={() =>
              patch({
                rules: [
                  ...getEditableRules(latestValueRef.current),
                  { word: "", replacement: "***" },
                ],
              })
            }
          >
            添加替换规则
          </Button>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex flex-col">
              <h3 className="text-sm font-medium">替换深度思考</h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                同时处理模型深度思考（reasoning）内容
              </p>
            </div>
            <Switch
              aria-label="替换深度思考"
              checked={applyToReasoning}
              onCheckedChange={(checked) => patch({ applyToReasoning: checked })}
            />
          </div>
        </div>
      </div>
    );
  },
);

SensitiveWordFilterConfig.displayName = "SensitiveWordFilterConfig";
