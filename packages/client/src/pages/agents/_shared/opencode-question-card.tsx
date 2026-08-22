import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { cn } from "@buildingai/ui/lib/utils";
import { useMemo, useState } from "react";

import type { OpencodePendingQuestion } from "./opencode-turn-client";

type QuestionAction = (input: { requestId: string; answers: string[][] }) => Promise<unknown>;

export function OpencodeQuestionCard({
  question,
  onReply,
  onReject,
}: {
  question: OpencodePendingQuestion;
  onReply: QuestionAction;
  onReject: (requestId: string) => Promise<unknown>;
}) {
  const [answers, setAnswers] = useState<string[][]>(() => question.questions.map(() => []));
  const [custom, setCustom] = useState<string[]>(() => question.questions.map(() => ""));
  const [sending, setSending] = useState(false);
  const complete = useMemo(
    () =>
      question.questions.every((item, index) => answers[index]?.length || custom[index]?.trim()),
    [answers, custom, question.questions],
  );
  const select = (index: number, label: string, multiple: boolean) => {
    setAnswers((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        if (!multiple) return [label];
        return item.includes(label) ? item.filter((value) => value !== label) : [...item, label];
      }),
    );
  };
  const submit = async () => {
    if (sending || !complete) return;
    setSending(true);
    try {
      await onReply({
        requestId: question.requestId,
        answers: question.questions.map((item, i) => {
          const customAnswer = custom[i]?.trim();
          if (!customAnswer) return answers[i] ?? [];
          return item.multiple ? [...(answers[i] ?? []), customAnswer] : [customAnswer];
        }),
      });
    } finally {
      setSending(false);
    }
  };
  const reject = async () => {
    if (sending) return;
    setSending(true);
    try {
      await onReject(question.requestId);
    } finally {
      setSending(false);
    }
  };
  return (
    <section
      className="bg-muted/40 border-border w-full rounded-xl border p-4"
      aria-label="OpenCode question"
    >
      <div className="text-muted-foreground mb-3 text-xs">
        {question.questions.length}/ {question.questions.length} 个问题
      </div>
      <div className="space-y-4">
        {question.questions.map((item, index) => (
          <div key={`${question.requestId}-${index}`} className="space-y-2">
            <p className="text-sm font-medium">{item.header}</p>
            <p className="text-foreground text-sm">{item.question}</p>
            <div className="space-y-2">
              {item.options.map((option) => {
                const selected = answers[index]?.includes(option.label);
                return (
                  <button
                    key={option.label}
                    type="button"
                    disabled={sending}
                    onClick={() => select(index, option.label, item.multiple)}
                    className={cn(
                      "border-input bg-background flex w-full items-start gap-3 rounded-lg border p-3 text-left",
                      selected && "border-primary bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 size-4 shrink-0 rounded-full border",
                        item.multiple && "rounded-sm",
                        selected && "border-primary bg-primary",
                      )}
                    />
                    <span>
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="text-muted-foreground block text-xs">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {item.custom ? (
              <Input
                value={custom[index] ?? ""}
                disabled={sending}
                placeholder="输入自定义答案"
                onChange={(event) =>
                  setCustom((current) =>
                    current.map((value, i) => (i === index ? event.target.value : value)),
                  )
                }
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={sending} onClick={() => void reject()}>
          忽略
        </Button>
        <Button type="button" disabled={sending || !complete} onClick={() => void submit()}>
          提交
        </Button>
      </div>
    </section>
  );
}
