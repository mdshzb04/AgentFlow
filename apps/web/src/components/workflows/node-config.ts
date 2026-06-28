import type { WorkflowNodeType } from "@/types/workflow";
import {
  Bot,
  GitBranch,
  Globe,
  Mail,
  Play,
  Sheet,
  Square,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const NODE_META: Record<
  WorkflowNodeType,
  { label: string; icon: LucideIcon; color: string; border: string }
> = {
  trigger: {
    label: "Trigger",
    icon: Play,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/40",
  },
  webhook: {
    label: "Webhook",
    icon: Globe,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    border: "border-blue-500/40",
  },
  ai: {
    label: "AI",
    icon: Bot,
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    border: "border-violet-500/40",
  },
  crm: {
    label: "CRM",
    icon: Users,
    color: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    border: "border-sky-500/40",
  },
  n8n: {
    label: "n8n",
    icon: Workflow,
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    border: "border-orange-500/40",
  },
  condition: {
    label: "Condition",
    icon: GitBranch,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    border: "border-amber-500/40",
  },
  gmail: {
    label: "Gmail",
    icon: Mail,
    color: "bg-red-500/10 text-red-700 dark:text-red-400",
    border: "border-red-500/40",
  },
  google_sheets: {
    label: "Google Sheets",
    icon: Sheet,
    color: "bg-green-500/10 text-green-700 dark:text-green-400",
    border: "border-green-500/40",
  },
  end: {
    label: "End",
    icon: Square,
    color: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
    border: "border-zinc-500/40",
  },
  n8n_native: {
    label: "n8n Node",
    icon: Workflow,
    color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-500/40",
  },
  unsupported: {
    label: "n8n Node",
    icon: Workflow,
    color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-500/40",
  },
};

export function getDefaultNodeLabel(type: WorkflowNodeType): string {
  return NODE_META[type].label;
}

export function createNodeId(type: WorkflowNodeType): string {
  return `${type}-${crypto.randomUUID().slice(0, 8)}`;
}
