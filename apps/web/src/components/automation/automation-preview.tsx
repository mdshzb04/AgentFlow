"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Globe,
  Play,
  Workflow,
} from "lucide-react";

import { NODE_META } from "@/components/workflows/node-config";
import type { WorkflowNodeType } from "@/types/workflow";
import type { AutomationPlan } from "@/lib/automation-builder";
import { cn } from "@/lib/utils";

const EXTRA_ICONS: Record<string, LucideIcon> = {
  webhook: Globe,
  manual: Play,
};

function nodeIcon(type: string): LucideIcon {
  if (type in NODE_META) {
    return NODE_META[type as WorkflowNodeType].icon;
  }
  return Bot;
}

interface AutomationPreviewProps {
  plan: AutomationPlan;
  className?: string;
}

export function AutomationPreview({ plan, className }: AutomationPreviewProps) {
  const nodes = plan.workflow.nodes;
  const TriggerIcon = EXTRA_ICONS[plan.trigger_type] ?? Play;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-border/60 bg-card/40 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{plan.summary}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <TriggerIcon className="size-3.5" />
          {plan.trigger_type === "webhook"
              ? "Webhook trigger"
              : "Manual run"}
        </span>
        {plan.webhook && (
          <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            {plan.webhook.name}
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-2">
          {nodes.map((node, index) => {
            const Icon = nodeIcon(node.type);
            const meta = NODE_META[node.type as WorkflowNodeType];
            return (
              <div key={node.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex w-36 flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center",
                    meta?.border ?? "border-border/60",
                    meta?.color ?? "bg-muted/20",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="line-clamp-2 text-xs font-medium">
                    {node.data.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide opacity-60">
                    {node.type}
                  </span>
                </div>
                {index < nodes.length - 1 && (
                  <div className="h-px w-6 shrink-0 bg-border/80" aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {plan.steps_summary.length > 0 && (
        <ol className="space-y-2 text-sm text-muted-foreground">
          {plan.steps_summary.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-xs text-primary/80">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {plan.webhook && (
          <PreviewMeta icon={Globe} label="Webhook" value={plan.webhook.name} />
        )}
        <PreviewMeta
          icon={Workflow}
          label="Workflow"
          value={`${nodes.length} steps · ${plan.name}`}
        />
      </div>
    </div>
  );
}

function PreviewMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium">{value}</p>
    </div>
  );
}
