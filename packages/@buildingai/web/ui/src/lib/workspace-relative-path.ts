/**
 * Normalize a workspace entry path to a clipboard-friendly relative path.
 */
export function normalizeWorkspaceRelativePath(path: string): string {
  const trimmed = String(path ?? "").trim();
  if (!trimmed || trimmed === "." || trimmed === "/") return ".";
  return trimmed.replace(/^\.\//, "").replace(/\/+$/, "");
}
