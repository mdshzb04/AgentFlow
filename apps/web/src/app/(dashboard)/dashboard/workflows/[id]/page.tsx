"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { WorkflowBuilder } from "@/components/workflows/workflow-builder";
import { N8nWorkflowPanel } from "@/components/integrations/n8n-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { deleteWorkflow, getWorkflow } from "@/lib/workflows";
import type { Workflow } from "@/types/workflow";

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflow = useCallback(async () => {
    if (!token || !workflowId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWorkflow(token, workflowId);
      setWorkflow(data);
    } catch {
      setError("Workflow not found");
    } finally {
      setIsLoading(false);
    }
  }, [token, workflowId]);

  useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow]);

  const handleDelete = async () => {
    if (!token || !workflow) return;
    try {
      await deleteWorkflow(token, workflow.id);
      router.push("/dashboard/workflows");
    } catch {
      setError("Failed to delete workflow");
    }
  };

  return (
    <DashboardShell>
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/workflows" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Workflows
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : error || !workflow ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-muted-foreground">{error ?? "Workflow not found"}</p>
          <Button render={<Link href="/dashboard/workflows" />}>
            Back to workflows
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b p-4">
            <N8nWorkflowPanel workflow={workflow} onUpdated={setWorkflow} />
          </div>
          <WorkflowBuilder
            workflow={workflow}
            token={token!}
            onSaved={setWorkflow}
            onDelete={handleDelete}
          />
        </div>
      )}
    </DashboardShell>
  );
}
