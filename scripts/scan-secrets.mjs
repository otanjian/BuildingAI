import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const trackedFiles = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
const requestedRoots = process.argv.slice(2);
const files = requestedRoots.length
    ? requestedRoots.flatMap((rootPath) => {
          const absolute = path.resolve(root, rootPath);
          if (!existsSync(absolute)) return [];
          if (statSync(absolute).isFile()) return [path.relative(root, absolute)];
          const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
              const child = path.join(directory, entry.name);
              return entry.isDirectory() ? walk(child) : [path.relative(root, child)];
          });
          return walk(absolute);
      })
    : trackedFiles;
const highConfidence = [
    /(?:sk-[A-Za-z0-9]{20,})/g,
    /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
    /(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/g,
    /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/g,
    /(?:password|secret|token|api[_-]?key)\s*[=:]\s*["'`](?!change-me|replace-me|your-)[^"'`\r\n]{16,}["'`]/gi,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
];
const ignored = /(?:\.lock$|\.map$|node_modules|dist\/|public\/web\/assets\/|\.spec\.ts$|verification\.md$)/;
const findings = [];
for (const relative of files) {
    if (ignored.test(relative)) continue;
    const absolute = path.join(root, relative);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) continue;
    let content;
    try { content = readFileSync(absolute, "utf8"); } catch { continue; }
    for (const pattern of highConfidence) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content))) {
            const line = content.slice(0, match.index).split("\n").length;
            const value = match[0].replace(/([=:]\s*["']?)[^\s"']+/u, "$1[REDACTED]");
            findings.push(`${relative}:${line}: ${value}`);
        }
    }
}
if (findings.length) {
    console.error("Potential secrets detected (values are redacted):");
    console.error([...new Set(findings)].join("\n"));
    process.exitCode = 1;
} else {
    console.log(`Secret scan passed: ${files.length} ${requestedRoots.length ? "requested artifact" : "tracked/worktree"} files inspected.`);
}
