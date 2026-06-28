"use client";

import { formatDistanceToNow } from "date-fns";
import { Bot, CheckCircle2, Clock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentExecution } from "@/types/agent";
import { cn } from "@/lib/utils";

function StatusIcon({ status }: { status: AgentExecution["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="size-4 text-emerald-500" />;
    case "failed":
      return <XCircle className="size-4 text-destructive" />;
    case "running":
      return <Clock className="size-4 animate-pulse text-blue-500" />;
    default:
      return <Clock className="size-4 text-muted-foreground" />;
  }
}

interface ExecutionCardProps {
  execution: AgentExecution;
  onClick?: () => void;
  compact?: boolean;
}

export function ExecutionCard({ execution, onClick, compact }: ExecutionCardProps) {
  const output = execution.output_data?.parsed ?? execution.output_data?.content;

  return (
    <Card
      className={cn("transition-colors", onClick && "cursor-pointer hover:bg-accent/30")}
      onClick={onClick}
    >
      <CardHeader className={cn("pb-2", compact && "py-3")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusIcon status={execution.status} />
            <CardTitle className="text-sm font-medium">
              {execution.template_slug?.replace(/_/g, " ") ?? "Agent Run"}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {execution.provider}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bot className="size-3" />
            {execution.model}
          </span>
          {execution.duration_ms != null && <span>{execution.duration_ms}ms</span>}
          <span>
            {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
          </span>
        </div>
      </CardHeader>
      {!compact && (
        <CardContent className="space-y-2">
          {execution.status === "failed" && execution.error_message && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {execution.error_message}
            </p>
          )}
          {output && (
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
              {typeof output === "string"
                ? output
                : JSON.stringify(output, null, 2)}
            </pre>
          )}
          {execution.tool_calls && execution.tool_calls.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {execution.tool_calls.length} tool call
              {execution.tool_calls.length !== 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
