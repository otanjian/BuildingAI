import { createHash } from "crypto";

export type DocumentSecurityVerdict = {
    safe: boolean;
    reasons: string[];
    checksum: string;
};

const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
const ARCHIVE_EXTENSIONS = /\.(zip|tar|tgz|gz|7z|rar)$/i;
const ACTIVE_CONTENT_EXTENSIONS = /\.(exe|dll|so|dylib|js|vbs|ps1|bat|cmd|html?|svg)$/i;
const PROMPT_INJECTION = /(ignore\s+(all\s+)?previous\s+instructions|system\s+prompt|developer\s+message|泄露.*提示词|忽略之前的指令)/i;

export function scanDocumentBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType?: string | null,
): DocumentSecurityVerdict {
    const reasons: string[] = [];
    const name = String(fileName || "unknown");
    const mime = String(mimeType || "").toLowerCase();
    if (buffer.byteLength > MAX_DOCUMENT_BYTES) reasons.push("file_too_large");
    if (ARCHIVE_EXTENSIONS.test(name) || mime.includes("zip") || mime.includes("compressed")) {
        reasons.push("archive_requires_isolation");
    }
    if (ACTIVE_CONTENT_EXTENSIONS.test(name) || /javascript|executable|html/.test(mime)) {
        reasons.push("active_content_not_allowed");
    }
    const sample = buffer.subarray(0, Math.min(buffer.length, 256 * 1024)).toString("utf8");
    if (PROMPT_INJECTION.test(sample)) reasons.push("prompt_injection_indicator");
    return {
        safe: reasons.length === 0,
        reasons,
        checksum: createHash("sha256").update(buffer).digest("hex"),
    };
}

export function assertSafeDocument(verdict: DocumentSecurityVerdict): void {
    if (!verdict.safe) {
        throw new Error(`Document quarantined: ${verdict.reasons.join(",")}`);
    }
}
