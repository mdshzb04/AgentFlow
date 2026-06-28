"use client";

import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StepExecution } from "@/types/integrations";
import { cn } from "@/lib/utils";

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (status === "failed") return <XCircle className="size-4 text-destructive" />;
  return <Clock className="size-4 text-muted-foreground" />;
}

interface StepExecutionCardProps {
  step: StepExecution;
  onClick?: () => void;
  compact?: boolean;
}

export function StepExecutionCard({ step, onClick, compact }: StepExecutionCardProps) {
  return (
    <Card
      className={cn("transition-colors", onClick && "cursor-pointer hover:bg-accent/30")}
      onClick={onClick}
    >
      <CardHeader className={cn("pb-2", compact && "py-3")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusIcon status={step.status} />
            <CardTitle className="text-sm font-medium capitalize">
              {step.node_type.replace(/_/g, " ")}
            </CardTitle>
          </div>
          {step.integration_provider && (
            <Badge variant="outline" className="text-xs">
              {step.integration_provider}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Node: {step.node_id}</span>
          {step.duration_ms != null && <span>{step.duration_ms}ms</span>}
          <span>
            {formatDistanceToNow(new Date(step.created_at), { addSuffix: true })}
          </span>
        </div>
      </CardHeader>
      {!compact && (
        <CardContent className="space-y-2">
          {step.error_message && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {step.error_message}
            </p>
          )}
          {step.output_data && (
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(step.output_data, null, 2)}
            </pre>
          )}
        </CardContent>
      )}
    </Card>
  );
}
