"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Upload, Workflow } from "lucide-react";

import { AutomationBuilderPanel } from "@/components/automation/automation-builder-panel";
import { N8nImportDialog } from "@/components/integrations/n8n-import-dialog";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TableCardsSkeleton } from "@/components/layout/page-skeleton";
import { toastError, toastSuccess } from "@/lib/toast";
import { createWorkflow, deleteWorkflow, listWorkflows } from "@/lib/workflows";
import type { Workflow as WorkflowType } from "@/types/workflow";

function statusVariant(status: WorkflowType["status"]) {
  switch (status) {
    case "active":
      return "default" as const;
    case "archived":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default function WorkflowsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await listWorkflows(token);
      setWorkflows(data);
    } catch (err) {
      toastError(err, "Failed to load workflows");
      setError("Failed to load workflows");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadWorkflows();
  }, [loadWorkflows]);

  const handleManualCreate = async () => {
    if (!token) return;
    setIsCreatingManual(true);
    try {
      const workflow = await createWorkflow(token, {
        name: "Untitled Workflow",
      });
      router.push(`/dashboard/workflows/${workflow.id}`);
      toastSuccess("Workflow created");
    } catch (err) {
      toastError(err, "Failed to create workflow");
      setIsCreatingManual(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || !window.confirm("Delete this workflow?")) return;
    try {
      await deleteWorkflow(token, id);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toastSuccess("Workflow deleted");
    } catch (err) {
      toastError(err, "Failed to delete workflow");
    }
  };

  return (
    <DashboardShell>
      <DashboardHeader
        title="Automations"
        description="Describe what you want — AI builds the workflow, schedule, and triggers"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <AutomationBuilderPanel onDeployed={loadWorkflows} />

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Your automations</h2>
            <p className="text-xs text-muted-foreground">
              {workflows.length} workflow{workflows.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                <Upload className="mr-2 size-4" />
                Import n8n
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import from n8n</DialogTitle>
                  <DialogDescription>
                    Pull a workflow from your n8n instance or upload a JSON export file.
                  </DialogDescription>
                </DialogHeader>
                <N8nImportDialog
                  onImported={(id) => {
                    void loadWorkflows();
                    router.push(`/dashboard/workflows/${id}`);
                  }}
                />
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualCreate}
              disabled={isCreatingManual}
            >
              {isCreatingManual ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Workflow className="mr-2 size-4" />
              )}
              Manual builder
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <TableCardsSkeleton count={3} />
        ) : workflows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Workflow className="mb-4 size-10 text-muted-foreground" />
              <h3 className="text-base font-semibold">No automations yet</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Use the AI builder above to describe your first automation in plain
                English.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <Link key={workflow.id} href={`/dashboard/workflows/${workflow.id}`}>
                <Card className="h-full transition-colors hover:bg-accent/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-1 text-base">
                        {workflow.name}
                      </CardTitle>
                      <Badge variant={statusVariant(workflow.status)}>
                        {workflow.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {workflow.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {workflow.definition.nodes.length} node
                      {workflow.definition.nodes.length !== 1 ? "s" : ""}
                    </span>
                    <span>
                      Updated{" "}
                      {formatDistanceToNow(new Date(workflow.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </CardContent>
                  <div className="px-6 pb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => handleDelete(workflow.id, e)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
