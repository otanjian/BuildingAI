import { existsSync, readdirSync, statSync, copyFileSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const rootDir = resolve(resolve(__filename, ".."), "..");
const EDITOR_MAP = { agent: ".agent/skills", agents: ".agents/skills", gemini: ".gemini/skills", kiro: ".kiro/skills", trae: ".trae/skills", windsurf: ".windsurf/skills", cursor: ".cursor/skills", claude: ".claude/skills", vercel: ".vercel/skills" };
const SOURCE_DIR = join(rootDir, "skills");
const IGNORED = new Set([".DS_Store"]);

function listFiles(dir, prefix = "") {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (IGNORED.has(entry.name)) return [];
        const rel = join(prefix, entry.name);
        const path = join(dir, entry.name);
        return entry.isDirectory() ? listFiles(path, rel) : [rel];
    });
}

function sameFile(a, b) {
    if (!existsSync(a) || !existsSync(b)) return false;
    const sa = statSync(a); const sb = statSync(b);
    if (sa.size !== sb.size) return false;
    return readFileSync(a).equals(readFileSync(b));
}

function targetDirs(editor) {
    if (!editor) return Object.values(EDITOR_MAP);
    const dir = EDITOR_MAP[editor.toLowerCase()];
    if (!dir) throw new Error(`Unknown editor: ${editor}. Available: ${Object.keys(EDITOR_MAP).join(", ")}`);
    return [dir];
}

function syncSkill(skill, editor, dryRun) {
    const source = join(SOURCE_DIR, skill);
    if (!existsSync(source) || !statSync(source).isDirectory()) throw new Error(`Skill "${skill}" not found in ${SOURCE_DIR}`);
    const files = listFiles(source);
    const dirs = targetDirs(editor);
    let added = 0, updated = 0, skipped = 0, removed = 0;
    for (const dir of dirs) {
        const target = join(rootDir, dir, skill);
        for (const rel of files) {
            const from = join(source, rel); const to = join(target, rel);
            if (sameFile(from, to)) { skipped++; continue; }
            const existed = existsSync(to);
            const parent = resolve(to, "..");
            if (!dryRun) mkdirSync(parent, { recursive: true });
            if (!dryRun) copyFileSync(from, to);
            existed ? updated++ : added++;
            console.log(`${dryRun ? "would " : ""}${existed ? "update" : "add"} ${join(dir, skill, rel)}`);
        }
        if (existsSync(target)) {
            for (const rel of listFiles(target)) {
                if (!files.includes(rel)) {
                    if (!dryRun) rmSync(join(target, rel), { force: true });
                    removed++; console.log(`${dryRun ? "would " : ""}remove ${join(dir, skill, rel)}`);
                }
            }
        }
    }
    console.log(`${dryRun ? "Dry run" : "Synced"} ${skill}: ${added} added, ${updated} updated, ${skipped} unchanged, ${removed} removed`);
}

function removeSkill(skill, editor, dryRun) {
    for (const dir of targetDirs(editor)) {
        const target = join(rootDir, dir, skill);
        if (existsSync(target)) { if (!dryRun) rmSync(target, { recursive: true, force: true }); console.log(`${dryRun ? "would " : ""}remove ${join(dir, skill)}`); }
    }
}

function allSkills() { return readdirSync(SOURCE_DIR, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name); }

function lintSkills() {
    const issues = []; let files = 0; let words = 0;
    for (const skill of allSkills()) {
        const dir = join(SOURCE_DIR, skill); const mdFiles = listFiles(dir).filter((f) => f.endsWith(".md"));
        const main = join(dir, "SKILL.md");
        if (!existsSync(main)) { issues.push(`${skill}: missing SKILL.md`); continue; }
        const content = readFileSync(main, "utf8"); files++;
        const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (!match || !/^name:\s*\S+/m.test(match[1]) || !/^description:\s*(?:\S|\n)/m.test(match[1])) issues.push(`${relative(rootDir, main)}: invalid frontmatter (name/description required)`);
        const lines = content.split("\n").length; words += content.trim().split(/\s+/).filter(Boolean).length;
        if (lines > 500) issues.push(`${relative(rootDir, main)}: ${lines} lines (max 500)`);
        for (const rel of mdFiles) {
            const file = join(dir, rel); const text = readFileSync(file, "utf8");
            for (const ref of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
                const target = ref[1]; if (!target || target.includes("://") || target.startsWith("#")) continue;
                const clean = target.split("#")[0]; if (clean && !existsSync(join(file, "..", clean)) && !existsSync(resolve(file, "..", clean))) issues.push(`${relative(rootDir, file)}: broken link ${target}`);
            }
            for (const term of ["ai-sdk-new/", "Pinia"]) if (text.includes(term)) issues.push(`${relative(rootDir, file)}: stale repository term ${term}`);
        }
    }
    if (issues.length) { console.error(`Skill lint failed (${issues.length} issue(s))`); for (const issue of issues) console.error(`- ${issue}`); process.exitCode = 1; }
    else console.log(`Skill lint passed: ${files} SKILL.md files, ${words} words`);
}

function main() {
    const args = process.argv.slice(2); const command = args[0]; const target = args[1];
    const dryRun = args.includes("--dry-run"); const positional = args.slice(1).filter((a) => a !== "--dry-run");
    let skill = positional[0]; let editor = positional[1] || null;
    if (command === "lint") { lintSkills(); return; }
    if (command === "sync" && !editor && skill && EDITOR_MAP[skill.toLowerCase()] && skill !== "all") { editor = skill; skill = "all"; }
    if (!command || !skill || !["sync", "remove"].includes(command)) {
        console.error("Usage: pnpm skills sync <skill|all> [editor] [--dry-run] | pnpm skills remove <skill|all> [editor] [--dry-run]"); process.exit(1);
    }
    try {
        const skills = skill === "all" ? allSkills() : [skill];
        for (const name of skills) command === "sync" ? syncSkill(name, editor, dryRun) : removeSkill(name, editor, dryRun);
    } catch (error) { console.error(chalk.red(`Error: ${error.message}`)); process.exit(1); }
}

main();
