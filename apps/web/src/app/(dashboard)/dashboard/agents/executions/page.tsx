"use client";

import { useCallback, useEffect, useState } from "react";

import { ExecutionCard } from "@/components/agents/execution-card";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { listExecutions } from "@/lib/agent";
import type { AgentExecution } from "@/types/agent";

export default function ExecutionsPage() {
  const { token } = useAuth();
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<AgentExecution | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await listExecutions(token, { limit: 50 });
      setExecutions(data);
    } catch {
      setError("Failed to load execution history");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell>
      <DashboardHeader
        title="Execution History"
        description="All AI agent runs with inputs, outputs, and tool calls"
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : executions.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No executions yet. Run an agent from the AI Agents page.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {executions.map((execution) => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                compact
                onClick={() => setSelected(execution)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected?.template_slug?.replace(/_/g, " ") ?? "Execution Detail"}
            </DialogTitle>
          </DialogHeader>
          {selected && <ExecutionCard execution={selected} />}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
