"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@buildingai/ui/components/ui/collapsible";
import { cn } from "@buildingai/ui/lib/utils";
import { BracesIcon, ChevronDownIcon } from "lucide-react";
import {
  cloneElement,
  type ComponentProps,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import type { BundledLanguage } from "shiki";
import { useIsCodeFenceIncomplete } from "streamdown";

import { CodeBlock, CodeBlockCopyButton } from "./code-block";
import { EchartsBlock } from "./echarts-block";
import { isEchartsFenceLanguage, parseEchartsOption } from "./parse-echarts-option";

const LANGUAGE_CLASS_RE = /language-([\w-]+)/;

type MarkdownCodeProps = ComponentProps<"code"> & {
  node?: unknown;
  "data-block"?: boolean | string;
  children?: ReactNode;
};

function extractCodeText(children: ReactNode): string {
  if (typeof children === "string") {
    return children;
  }
  if (
    isValidElement(children) &&
    children.props &&
    typeof children.props === "object" &&
    "children" in children.props &&
    typeof children.props.children === "string"
  ) {
    return children.props.children;
  }
  return "";
}

function isInspectionResultJson(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) {
    return false;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return (
      typeof parsed.ruleCode === "string" ||
      Array.isArray(parsed.details) ||
      typeof parsed.failedRecords === "number"
    );
  } catch {
    return false;
  }
}

function shouldCollapseJsonBlock(language: string, code: string): boolean {
  const lang = language.toLowerCase();
  if (lang === "json" || lang === "jsonc") {
    return true;
  }
  if (!lang && isInspectionResultJson(code)) {
    return true;
  }
  return false;
}

function getJsonSummary(code: string): string {
  try {
    const parsed = JSON.parse(code) as {
      ruleCode?: string;
      failedRecords?: number;
      totalRecords?: number;
      conclusion?: string;
      details?: unknown[];
    };
    const parts: string[] = [];
    if (parsed.ruleCode) {
      parts.push(parsed.ruleCode);
    }
    if (typeof parsed.failedRecords === "number") {
      parts.push(`${parsed.failedRecords} failed`);
    }
    if (typeof parsed.totalRecords === "number") {
      parts.push(`${parsed.totalRecords} checked`);
    }
    if (parsed.conclusion) {
      parts.push(parsed.conclusion);
    }
    if (parts.length > 0) {
      return parts.join(" · ");
    }
    if (Array.isArray(parsed.details)) {
      return `${parsed.details.length} detail rows`;
    }
  } catch {
    /* fall through */
  }
  return `${code.split("\n").length} lines`;
}

function BlockCodePanel({
  code,
  language,
  className,
}: {
  code: string;
  language: string;
  className?: string;
}) {
  const shikiLanguage = (language || "text") as BundledLanguage;

  return (
    <div
      className={cn(
        "group border-border bg-sidebar relative my-4 flex w-full flex-col gap-0 overflow-hidden rounded-xl border",
        className,
      )}
      data-streamdown="code-block"
    >
      <div className="border-border text-muted-foreground flex h-8 items-center border-b px-3 text-xs">
        <span className="font-mono lowercase">{language || "text"}</span>
      </div>
      <CodeBlock className="my-0 rounded-none border-0" code={code} language={shikiLanguage}>
        <div className="pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end">
          <div className="border-sidebar bg-sidebar/80 supports-[backdrop-filter]:bg-sidebar/70 pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border px-1.5 py-1 supports-[backdrop-filter]:backdrop-blur">
            <CodeBlockCopyButton />
          </div>
        </div>
      </CodeBlock>
    </div>
  );
}

const CollapsibleJsonCodeBlock = memo(function CollapsibleJsonCodeBlock({
  code,
  language,
  className,
  isStreaming,
}: {
  code: string;
  language: string;
  className?: string;
  isStreaming: boolean;
}) {
  const summary = useMemo(() => getJsonSummary(code), [code]);
  const [userExpanded, setUserExpanded] = useState(false);
  const open = isStreaming || userExpanded;

  // Reset expansion when streaming finishes (derive during render, React Compiler-compatible)
  const [prevStreaming, setPrevStreaming] = useState(isStreaming);
  if (prevStreaming !== isStreaming) {
    setPrevStreaming(isStreaming);
    if (!isStreaming) {
      setUserExpanded(false);
    }
  }

  return (
    <Collapsible
      className={cn("my-4 w-full", className)}
      open={open}
      onOpenChange={(next) => {
        if (!isStreaming) {
          setUserExpanded(next);
        }
      }}
    >
      <CollapsibleTrigger
        className={cn(
          "border-border bg-sidebar flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm",
          "hover:bg-sidebar/80 transition-colors",
          open && "rounded-b-none border-b-0",
        )}
        type="button"
      >
        <ChevronDownIcon
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
        <BracesIcon className="text-muted-foreground size-4 shrink-0" />
        <span className="font-medium">Structured result (JSON)</span>
        <span className="text-muted-foreground ml-auto truncate text-xs">{summary}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <BlockCodePanel
          className="my-0 rounded-t-none border-t-0"
          code={code}
          language={language || "json"}
        />
      </CollapsibleContent>
    </Collapsible>
  );
});

export const CollapsibleMarkdownCode = memo(function CollapsibleMarkdownCode({
  className,
  children,
  ...props
}: MarkdownCodeProps) {
  const isInline = !("data-block" in props);
  const isStreaming = useIsCodeFenceIncomplete();

  if (isInline) {
    return (
      <code
        className={cn("bg-muted rounded px-1.5 py-0.5 font-mono text-sm", className)}
        data-streamdown="inline-code"
        {...props}
      >
        {children}
      </code>
    );
  }

  const language = className?.match(LANGUAGE_CLASS_RE)?.[1] ?? "";
  const code = extractCodeText(children);

  if (isEchartsFenceLanguage(language)) {
    if (isStreaming) {
      return <BlockCodePanel className={className} code={code} language={language} />;
    }
    const parsed = parseEchartsOption(code);
    if (parsed.ok === false) {
      return (
        <div className="my-4 w-full">
          <p className="text-muted-foreground mb-2 text-xs">{parsed.error}</p>
          <BlockCodePanel className={cn(className, "my-0")} code={code} language={language} />
        </div>
      );
    }
    return <EchartsBlock className={className} option={parsed.option} />;
  }

  if (shouldCollapseJsonBlock(language, code)) {
    return (
      <CollapsibleJsonCodeBlock
        className={className}
        code={code}
        isStreaming={isStreaming}
        language={language || "json"}
      />
    );
  }

  return <BlockCodePanel className={className} code={code} language={language} />;
});

export const streamdownMarkdownComponents = {
  code: CollapsibleMarkdownCode,
  pre: ({ children }: { children?: ReactNode }) => {
    if (isValidElement(children)) {
      return cloneElement(children as ReactElement<{ "data-block"?: boolean }>, {
        "data-block": true,
      });
    }
    return children;
  },
};
