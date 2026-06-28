"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { NODE_META } from "@/components/workflows/node-config";
import { getCategoryColor, getN8nNodeMetadata } from "@/lib/n8n-node-registry";
import type { WorkflowNodeType } from "@/types/workflow";
import { cn } from "@/lib/utils";

type WorkflowNodeData = {
  label: string;
  config?: Record<string, unknown>;
  n8nType?: string;
  n8nNodeName?: string;
  imported?: boolean;
};

function WorkflowNodeComponent({ type, data }: NodeProps) {
  const nodeType = type as WorkflowNodeType;
  const isN8nWrapped = nodeType === "n8n_native" || nodeType === "unsupported";
  const meta = NODE_META[nodeType];
  const Icon = meta?.icon ?? NODE_META.end.icon;
  const isTrigger = nodeType === "trigger";
  const isEnd = nodeType === "end";
  const isCondition = nodeType === "condition";
  const nodeData = data as WorkflowNodeData;
  const n8nType = nodeData.n8nType ?? (nodeData.config?.n8nType as string | undefined) ?? "";
  const n8nMeta = n8nType ? getN8nNodeMetadata(n8nType) : null;
  const headerLabel = isN8nWrapped && n8nMeta
    ? n8nMeta.displayName
    : (meta?.label ?? "Node");
  const headerColor = isN8nWrapped && n8nMeta
    ? getCategoryColor(n8nMeta.category)
    : (meta?.color ?? NODE_META.end.color);

  return (
    <div
      className={cn(
        "min-w-[180px] rounded-xl border-2 bg-card shadow-sm transition-shadow hover:shadow-md",
        meta?.border ?? "border-zinc-500/40",
      )}
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!size-2.5 !border-2 !border-background !bg-muted-foreground"
        />
      )}

      <div className={cn("flex items-center gap-2 rounded-t-[10px] px-3 py-2", headerColor)}>
        <Icon className="size-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide">{headerLabel}</span>
        {isN8nWrapped && n8nMeta && (
          <span className="ml-auto rounded-full bg-background/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider opacity-80">
            {n8nMeta.category}
          </span>
        )}
      </div>

      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-foreground">{nodeData.label}</p>
        {nodeType === "ai" && typeof nodeData.config?.template === "string" && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {nodeData.config.template as string}
          </p>
        )}
        {nodeType === "n8n" && typeof nodeData.config?.n8nWorkflowId === "string" && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Workflow {nodeData.config.n8nWorkflowId as string}
          </p>
        )}
        {nodeType === "crm" && typeof nodeData.config?.entity === "string" && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {nodeData.config.action as string} {nodeData.config.entity as string}
          </p>
        )}
        {isN8nWrapped && n8nType && (
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{n8nType}</p>
        )}
      </div>

      {!isEnd && !isCondition && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-2.5 !border-2 !border-background !bg-muted-foreground"
        />
      )}

      {isCondition && (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Bottom}
            style={{ left: "30%" }}
            className="!size-2.5 !border-2 !border-background !bg-emerald-500"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            style={{ left: "70%" }}
            className="!size-2.5 !border-2 !border-background !bg-red-500"
          />
          <div className="flex justify-between px-3 pb-2 text-[10px] text-muted-foreground">
            <span>Yes</span>
            <span>No</span>
          </div>
        </>
      )}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);

export const workflowNodeTypes = {
  trigger: WorkflowNode,
  webhook: WorkflowNode,
  ai: WorkflowNode,
  crm: WorkflowNode,
  n8n: WorkflowNode,
  condition: WorkflowNode,
  gmail: WorkflowNode,
  google_sheets: WorkflowNode,
  end: WorkflowNode,
  n8n_native: WorkflowNode,
  unsupported: WorkflowNode,
} as const;
