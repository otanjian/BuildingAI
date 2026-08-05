import type { SensitiveWordConfig } from "@buildingai/types";
import { Field, FieldGroup } from "@buildingai/ui/components/ui/field";
import { Input } from "@buildingai/ui/components/ui/input";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { memo } from "react";

const DEFAULT_REPLACEMENT = "***";

export const SensitiveWordFilterConfig = memo(
  ({
    value,
    onChange,
  }: {
    value: SensitiveWordConfig | null;
    onChange: (value: SensitiveWordConfig | null) => void;
  }) => {
    const enabled = value?.enabled ?? false;
    const words = value?.words ?? [];
    const replacement = value?.replacement || DEFAULT_REPLACEMENT;
    const applyToReasoning = value?.applyToReasoning !== false;

    const patch = (updates: Partial<SensitiveWordConfig>) => {
      onChange({
        enabled,
        words,
        replacement,
        applyToReasoning,
        ...updates,
      });
    };

    return (
      <div className="bg-secondary rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">敏感词过滤</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              开启后，智能体回复中的敏感词将自动替换，直播与历史记录保持一致
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => onChange(checked ? patch({ enabled: true }) : null)}
          />
        </div>

        {enabled && (
          <div className="mt-3 space-y-3">
            <FieldGroup>
              <Field
                orientation="vertical"
                label="敏感词列表"
                description="每行一个敏感词，支持中英文；英文字母匹配不区分大小写"
              >
                <Textarea
                  value={words.join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean);
                    patch({ words: lines });
                  }}
                  placeholder={"例如：\n机密\napikey"}
                  className="bg-background resize-none"
                  rows={5}
                />
              </Field>
            </FieldGroup>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldGroup>
                <Field
                  orientation="vertical"
                  label="替换内容"
                  description={`默认 ${DEFAULT_REPLACEMENT}`}
                >
                  <Input
                    value={replacement}
                    onChange={(e) => patch({ replacement: e.target.value })}
                    placeholder={DEFAULT_REPLACEMENT}
                  />
                </Field>
              </FieldGroup>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-sm font-medium">过滤深度思考</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  同时对模型深度思考（reasoning）内容执行替换
                </p>
              </div>
              <Switch
                checked={applyToReasoning}
                onCheckedChange={(checked) => patch({ applyToReasoning: checked })}
              />
            </div>
          </div>
        )}
      </div>
    );
  },
);

SensitiveWordFilterConfig.displayName = "SensitiveWordFilterConfig";
