/**
 * Parse, validate, and preview n8n workflow JSON on the client before import.
 */

import {
  getN8nNodeMetadata,
  isN8nCompatibleNode,
  isOfficialN8nType,
  normalizeN8nType,
} from "@/lib/n8n-node-registry";

/** n8n node types that act as a workflow trigger. */
const TRIGGER_TYPE_LABELS: Record<string, string> = {
  "n8n-nodes-base.manualTrigger": "Manual Trigger",
  "n8n-nodes-base.start": "Start",
  "n8n-nodes-base.webhook": "Webhook",
  "n8n-nodes-base.cron": "Cron",
  "n8n-nodes-base.schedule": "Schedule",
  "n8n-nodes-base.emailReadImap": "Email (IMAP)",
  "n8n-nodes-base.formTrigger": "Form Trigger",
  "@n8n/n8n-nodes-langchain.manualTrigger": "Manual Trigger",
};

export interface N8nWorkflowPreview {
  name: string;
  nodeCount: number;
  connectionCount: number;
  trigger: string;
  nodeTypes: { type: string; count: number; displayName: string; category: string }[];
  communityTypes: string[];
  n8nNativeCount: number;
}

export interface N8nValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  preview: N8nWorkflowPreview | null;
  data: Record<string, unknown> | null;
}

/** Read a File and parse it as JSON, returning the raw object or throwing. */
export async function readN8nWorkflowFile(file: File): Promise<Record<string, unknown>> {
  let text = await file.text();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const parsed: unknown = JSON.parse(text);

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new Error("File contains an empty workflow list.");
    }
    const first = parsed[0];
    if (!isPlainObject(first)) {
      throw new Error("File must contain a JSON object (an n8n workflow export).");
    }
    return first;
  }

  if (isPlainObject(parsed)) {
    for (const key of ["workflow", "data"]) {
      const nested = parsed[key];
      if (isPlainObject(nested) && Array.isArray(nested["nodes"])) {
        return nested;
      }
    }
    return parsed;
  }

  throw new Error("File must contain a JSON object (an n8n workflow export).");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTriggerType(type: string): boolean {
  if (TRIGGER_TYPE_LABELS[type]) return true;
  const lower = type.toLowerCase();
  return (
    lower.endsWith("trigger") ||
    lower === "n8n-nodes-base.start" ||
    lower === "n8n-nodes-base.webhook" ||
    lower === "n8n-nodes-base.cron"
  );
}

function triggerLabel(type: string): string {
  return TRIGGER_TYPE_LABELS[type] ?? type;
}

function summarizeNodeTypes(nodes: Record<string, unknown>[]) {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    const type = String(node["type"] ?? "unknown");
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([type, count]) => {
    const meta = getN8nNodeMetadata(normalizeN8nType(type));
    return {
      type,
      count,
      displayName: meta.displayName,
      category: meta.category,
    };
  });
}

function countConnections(connections: Record<string, unknown>): number {
  let total = 0;
  for (const outputs of Object.values(connections)) {
    if (!isPlainObject(outputs)) continue;
    const main = outputs["main"];
    if (!Array.isArray(main)) continue;
    for (const outputList of main) {
      if (Array.isArray(outputList)) total += outputList.length;
    }
  }
  return total;
}

function detectTrigger(nodes: Record<string, unknown>[]): string {
  for (const node of nodes) {
    const type = String(node["type"] ?? "");
    if (isTriggerType(type)) return triggerLabel(type);
  }
  return "None";
}

/**
 * Validate parsed n8n workflow JSON and build a preview.
 * All official n8n nodes import with full compatibility — no placeholder warnings.
 */
export function validateN8nWorkflow(
  data: Record<string, unknown>,
  fallbackName?: string,
): N8nValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rawNodes = data["nodes"];
  if (!Array.isArray(rawNodes)) {
    errors.push("Missing or invalid `nodes` array.");
  } else if (rawNodes.length === 0) {
    errors.push("Workflow has no nodes to import.");
  }

  const rawConnections = data["connections"];
  if (rawConnections !== undefined && rawConnections !== null && !isPlainObject(rawConnections)) {
    errors.push("`connections` must be an object keyed by node name.");
  }

  const nodes = Array.isArray(rawNodes) ? (rawNodes as Record<string, unknown>[]) : [];
  const connections = isPlainObject(rawConnections) ? rawConnections : {};

  nodes.forEach((node, idx) => {
    if (!isPlainObject(node)) {
      errors.push(`Node #${idx + 1} is not an object.`);
      return;
    }
    if (typeof node["type"] !== "string" || !node["type"]) {
      errors.push(`Node #${idx + 1} is missing a \`type\`.`);
    }
    if (typeof node["name"] !== "string" || !node["name"]) {
      errors.push(`Node #${idx + 1} is missing a \`name\`.`);
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors, warnings, preview: null, data: null };
  }

  const nodeTypes = summarizeNodeTypes(nodes);
  const communityTypes = nodeTypes
    .map((n) => n.type)
    .filter((type) => !isOfficialN8nType(type) && !isN8nCompatibleNode(type));

  const n8nNativeCount = nodeTypes.filter(
    (n) => !isN8nCompatibleNode(normalizeN8nType(n.type)) || isOfficialN8nType(n.type),
  ).length;

  if (communityTypes.length > 0) {
    warnings.push(
      `${communityTypes.length} community node type${communityTypes.length === 1 ? "" : "s"} will import with compatibility wrappers: ${communityTypes.join(", ")}.`,
    );
  }

  const trigger = detectTrigger(nodes);
  if (trigger === "None") {
    warnings.push("No trigger node detected — use Push to n8n or Trigger for remote execution.");
  }

  const name =
    typeof data["name"] === "string" && data["name"].trim()
      ? data["name"].trim()
      : (fallbackName ?? "Imported from n8n");

  const preview: N8nWorkflowPreview = {
    name,
    nodeCount: nodes.length,
    connectionCount: countConnections(connections),
    trigger,
    nodeTypes,
    communityTypes,
    n8nNativeCount,
  };

  return { valid: true, errors, warnings, preview, data };
}
