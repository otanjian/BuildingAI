export type OpencodeWorkspaceFilePayload = {
  path: string;
  type: "text" | "binary";
  content: string;
  encoding?: string;
  mimeType?: string;
};

function decodeBase64(value: string): Uint8Array {
  const decoded = globalThis.atob(value);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

export function createOpencodeWorkspaceFileBlob(payload: OpencodeWorkspaceFilePayload): Blob {
  if (payload.type === "binary") {
    if (payload.encoding !== "base64") {
      throw new Error(`Unsupported workspace file encoding: ${payload.encoding ?? "unknown"}`);
    }
    return new Blob([decodeBase64(payload.content)], {
      type: payload.mimeType || "application/octet-stream",
    });
  }

  return new Blob([payload.content], {
    type: payload.mimeType || "text/plain;charset=utf-8",
  });
}

export function getOpencodeWorkspaceFileName(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  return normalized.split("/").pop() || "download";
}

export function isOpencodeWorkspaceImage(payload: OpencodeWorkspaceFilePayload): boolean {
  return payload.type === "binary" && payload.mimeType?.startsWith("image/") === true;
}
