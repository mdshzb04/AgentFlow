"use client";

import {
  getDefaultNodeLabel,
  NODE_META,
} from "@/components/workflows/node-config";
import { WORKFLOW_NODE_TYPES, type WorkflowNodeType } from "@/types/workflow";
import { cn } from "@/lib/utils";

interface NodePaletteProps {
  className?: string;
}

export function NodePalette({ className }: NodePaletteProps) {
  const onDragStart = (event: React.DragEvent, nodeType: WorkflowNodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col border-b bg-muted/30 lg:w-56 lg:border-b-0 lg:border-r",
        className,
      )}
    >
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Nodes</h2>
        <p className="text-xs text-muted-foreground">Drag onto the canvas</p>
      </div>
      <div className="flex w-full flex-row gap-1.5 overflow-x-auto p-3 lg:flex-col lg:gap-1.5 lg:overflow-y-auto lg:overflow-x-hidden">
        {WORKFLOW_NODE_TYPES.map(({ type, description }) => {
          const meta = NODE_META[type];
          const Icon = meta.icon;
          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => onDragStart(e, type)}
              className={cn(
                "flex min-w-[160px] shrink-0 cursor-grab items-start gap-2.5 rounded-lg border bg-card p-2.5 shadow-sm transition-colors active:cursor-grabbing hover:bg-accent/50 lg:min-w-0",
                meta.border,
              )}
            >
              <div className={cn("rounded-md p-1.5", meta.color)}>
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{getDefaultNodeLabel(type)}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
