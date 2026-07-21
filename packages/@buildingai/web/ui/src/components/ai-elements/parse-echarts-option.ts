export type ParseEchartsOptionResult =
  | { ok: true; option: Record<string, unknown> }
  | { ok: false; error: string };

const EXECUTABLE_STRING_RE = /^\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>|[a-zA-Z_$][\w$]*\s*=>)/;

export function isEchartsFenceLanguage(language: string): boolean {
  const lang = language.toLowerCase();
  return lang === "echarts" || lang === "echarts-json";
}

function isExecutableString(value: string): boolean {
  return EXECUTABLE_STRING_RE.test(value);
}

function findExecutableValue(value: unknown, path: string): string | null {
  if (typeof value === "string") {
    if (isExecutableString(value)) {
      return path || "(root)";
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = findExecutableValue(value[i], `${path}[${i}]`);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = path ? `${path}.${key}` : key;
      const found = findExecutableValue(child, childPath);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function parseEchartsOption(source: string): ParseEchartsOptionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { ok: false, error: "Invalid JSON for echarts option" };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "ECharts option must be a plain JSON object" };
  }

  const executablePath = findExecutableValue(parsed, "");
  if (executablePath) {
    return {
      ok: false,
      error: `Rejected executable string at ${executablePath} (formatter/function)`,
    };
  }

  return { ok: true, option: parsed as Record<string, unknown> };
}
