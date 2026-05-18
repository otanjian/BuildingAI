type ErrorLikeObject = Record<string, unknown>;

function extractMessageFromString(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:")) {
    const ssePayload = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => line.startsWith("data:"));

    if (ssePayload) {
      return extractMessageFromString(ssePayload.slice(5).trim());
    }
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      const parsedMessage = extractMessage(parsed);
      if (parsedMessage) return parsedMessage;
    } catch {
      // Ignore invalid JSON and fall back to the raw string.
    }
  }

  return trimmed;
}

function extractMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return extractMessageFromString(error);
  }

  if (error instanceof Error) {
    return (
      extractMessageFromString(error.message) ??
      extractMessage((error as Error & { cause?: unknown }).cause)
    );
  }

  if (error && typeof error === "object") {
    const errorLike = error as ErrorLikeObject;

    if (typeof errorLike.message === "string") {
      return extractMessageFromString(errorLike.message);
    }

    if (typeof errorLike.msg === "string") {
      return extractMessageFromString(errorLike.msg);
    }

    if (typeof errorLike.error === "string") {
      return extractMessageFromString(errorLike.error);
    }

    if ("details" in errorLike) {
      const detailsMessage = extractMessage(errorLike.details);
      if (detailsMessage) return detailsMessage;
    }

    if ("cause" in errorLike) {
      const causeMessage = extractMessage(errorLike.cause);
      if (causeMessage) return causeMessage;
    }

    try {
      const stringified = JSON.stringify(errorLike);
      if (stringified !== "{}") {
        return stringified;
      }
    } catch {
      // Ignore stringify errors.
    }
  }

  return null;
}

/**
 * Convert unknown error to string message
 * @param error - Unknown error object
 * @param fallback - Fallback message when error cannot be parsed
 * @returns Error message string
 */
export function getErrorMessage(error: unknown, fallback = "操作失败，请稍后重试"): string {
  return extractMessage(error) ?? fallback;
}
