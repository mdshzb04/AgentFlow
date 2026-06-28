"use client";

import { Suspense, useCallback, useEffect, useState } from "react";

import { StepExecutionCard } from "@/components/workflows/step-execution-card";
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
import { listStepExecutions } from "@/lib/integrations";
import type { StepExecution } from "@/types/integrations";

function WorkflowLogsContent() {
  const { token } = useAuth();
  const [steps, setSteps] = useState<StepExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<StepExecution | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await listStepExecutions(token);
      setSteps(data);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <DashboardHeader
        title="Workflow Logs"
        description="Execution history for all workflow steps including integrations"
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : steps.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No workflow executions yet. Run a workflow from the builder.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {steps.map((step) => (
              <StepExecutionCard
                key={step.id}
                step={step}
                compact
                onClick={() => setSelected(step)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selected?.node_type.replace(/_/g, " ")} — {selected?.status}
            </DialogTitle>
          </DialogHeader>
          {selected && <StepExecutionCard step={selected} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function WorkflowLogsPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<div className="p-4">Loading…</div>}>
        <WorkflowLogsContent />
      </Suspense>
    </DashboardShell>
  );
}
