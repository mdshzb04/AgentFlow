/**
 * n8n node registry — display metadata and official-type detection.
 * Mirrors apps/api/app/services/n8n_node_registry.py for client-side rendering.
 */

export const N8N_OFFICIAL_PREFIXES = [
  "n8n-nodes-base.",
  "@n8n/n8n-nodes-langchain.",
  "n8n-nodes-langchain.",
] as const;

export const DEPRECATED_ALIASES: Record<string, string> = {
  "n8n-nodes-base.function": "n8n-nodes-base.code",
  "n8n-nodes-base.functionItem": "n8n-nodes-base.code",
};

export interface N8nNodeMetadata {
  n8nType: string;
  normalizedType: string;
  displayName: string;
  category: string;
  official: boolean;
  shortType: string;
}

const KNOWN_NODES: Record<string, { displayName: string; category: string }> = {
  "n8n-nodes-base.manualTrigger": { displayName: "Manual Trigger", category: "Trigger" },
  "n8n-nodes-base.webhook": { displayName: "Webhook", category: "Trigger" },
  "n8n-nodes-base.if": { displayName: "IF", category: "Logic" },
  "n8n-nodes-base.set": { displayName: "Set", category: "Core" },
  "n8n-nodes-base.aggregate": { displayName: "Aggregate", category: "Core" },
  "n8n-nodes-base.respondToWebhook": { displayName: "Respond to Webhook", category: "HTTP" },
  "n8n-nodes-base.googleSheets": { displayName: "Google Sheets", category: "Google Workspace" },
  "n8n-nodes-base.googleSheetsTool": { displayName: "Google Sheets Tool", category: "AI / LangChain" },
  "n8n-nodes-base.googleDocsTool": { displayName: "Google Docs Tool", category: "AI / LangChain" },
  "n8n-nodes-base.googleDriveTool": { displayName: "Google Drive Tool", category: "AI / LangChain" },
  "n8n-nodes-base.slackTool": { displayName: "Slack Tool", category: "AI / LangChain" },
  "n8n-nodes-base.telegramTool": { displayName: "Telegram Tool", category: "AI / LangChain" },
  "n8n-nodes-base.slack": { displayName: "Slack", category: "Communication" },
  "n8n-nodes-base.workflow": { displayName: "Execute Workflow", category: "Flow" },
  "n8n-nodes-base.openAi": { displayName: "OpenAI", category: "AI" },
  "@n8n/n8n-nodes-langchain.agent": { displayName: "AI Agent", category: "AI / LangChain" },
};

export function normalizeN8nType(n8nType: string): string {
  return DEPRECATED_ALIASES[n8nType] ?? n8nType;
}

export function isOfficialN8nType(n8nType: string): boolean {
  const normalized = normalizeN8nType(n8nType);
  return N8N_OFFICIAL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function shortType(n8nType: string): string {
  for (const prefix of N8N_OFFICIAL_PREFIXES) {
    if (n8nType.startsWith(prefix)) return n8nType.slice(prefix.length);
  }
  return n8nType;
}

function camelToTitle(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferCategory(n8nType: string, short: string): string {
  const lower = n8nType.toLowerCase();
  const s = short.toLowerCase();
  if (s.endsWith("trigger") || s.includes("trigger")) return "Trigger";
  if (lower.includes("langchain") || s.endsWith("tool")) return "AI / LangChain";
  if (s.startsWith("google")) return "Google Workspace";
  if (s.startsWith("microsoft") || s === "outlook" || s === "teams") return "Microsoft";
  if (s.startsWith("aws")) return "AWS";
  if (["slack", "discord", "telegram", "gmail", "twilio"].includes(s)) return "Communication";
  if (["postgres", "mysql", "mongodb", "redis", "sqlite"].some((k) => s.includes(k))) return "Database";
  if (["openai", "anthropic", "gemini", "huggingface"].some((k) => s.includes(k))) return "AI";
  if (["if", "switch", "merge", "wait", "filter"].includes(s)) return "Logic";
  if (["httprequest", "respondtowebhook"].includes(s)) return "HTTP";
  if (isOfficialN8nType(n8nType)) return "Core";
  return "Community";
}

export function getN8nNodeMetadata(n8nType: string): N8nNodeMetadata {
  const normalized = normalizeN8nType(n8nType);
  const known = KNOWN_NODES[normalized] ?? KNOWN_NODES[n8nType];
  const short = shortType(normalized);
  return {
    n8nType,
    normalizedType: normalized,
    displayName: known?.displayName ?? camelToTitle(short),
    category: known?.category ?? inferCategory(normalized, short),
    official: isOfficialN8nType(n8nType),
    shortType: short,
  };
}

/** Node types with native AgentFlow editor + local execution. */
export const NATIVE_MAPPED_TYPES = new Set([
  "n8n-nodes-base.manualTrigger",
  "n8n-nodes-base.start",
  "n8n-nodes-base.webhook",
  "n8n-nodes-base.if",
  "n8n-nodes-base.gmail",
  "n8n-nodes-base.googleSheets",
  "@n8n/n8n-nodes-langchain.agent",
  "n8n-nodes-base.openAi",
  "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "n8n-nodes-base.httpRequest",
  "n8n-nodes-base.noOp",
]);

export function isN8nCompatibleNode(n8nType: string): boolean {
  const normalized = normalizeN8nType(n8nType);
  return NATIVE_MAPPED_TYPES.has(normalized) || isOfficialN8nType(normalized);
}

export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    Trigger: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Logic: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    Core: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    HTTP: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    "AI / LangChain": "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    AI: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    "Google Workspace": "bg-green-500/10 text-green-700 dark:text-green-400",
    Communication: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
    Database: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    AWS: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    Microsoft: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    Flow: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
    Community: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
  };
  return map[category] ?? map.Core;
}
