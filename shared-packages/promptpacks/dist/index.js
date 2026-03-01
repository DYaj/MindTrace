import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
export function listFrameworks(promptRoot) {
    if (!existsSync(promptRoot))
        return [];
    return readdirSync(promptRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
}
export function listPrompts(promptRoot, framework) {
    const dir = join(promptRoot, framework);
    if (!existsSync(dir))
        return [];
    return readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .map((f) => ({ name: f, path: join(dir, f) }));
}
export function getPromptText(promptRoot, framework, filename) {
    const p = join(promptRoot, framework, filename);
    return readFileSync(p, "utf8");
}
