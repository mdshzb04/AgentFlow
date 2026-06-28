"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Download,
  Loader2,
  Play,
  Upload,
  Workflow,
} from "lucide-react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  downloadN8nJson,
  exportN8nWorkflow,
  pushWorkflowToN8n,
  triggerN8nWorkflow,
} from "@/lib/n8n";
import { listIntegrationAccounts } from "@/lib/integrations";
import { toastError, toastSuccess } from "@/lib/toast";
import type { IntegrationAccount } from "@/types/integrations";
import type { N8nMetadata } from "@/types/n8n";
import type { Workflow as WorkflowType } from "@/types/workflow";

interface N8nWorkflowPanelProps {
  workflow: WorkflowType;
  onUpdated?: (workflow: WorkflowType) => void;
}

// Re-export for backward compatibility
export { N8nImportDialog } from "@/components/integrations/n8n-import-dialog";

export function N8nWorkflowPanel({ workflow, onUpdated }: N8nWorkflowPanelProps) {
  const { token } = useAuth();
  const [n8nAccounts, setN8nAccounts] = useState<IntegrationAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"info" | "error" | "success">("info");
  const [isBusy, setIsBusy] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  const meta = (workflow.n8n_metadata ?? {}) as N8nMetadata;
  const isImportedFromN8n = meta.source === "n8n";
  const hasConnectedAccounts = n8nAccounts.length > 0;

  // Determine if the workflow can be triggered.
  const hasWebhook = Boolean(meta.n8n_webhook_url);
  const hasN8nId = Boolean(meta.n8n_workflow_id);
  const hasAccountId = Boolean(selectedAccount || meta.n8n_instance_id);
  const canTrigger = hasWebhook || (hasN8nId && hasAccountId);

  const triggerDisabledReason = (() => {
    if (canTrigger) return undefined;
    if (!hasConnectedAccounts) {
      return "Connect your n8n instance on the Integrations page, then push this workflow before triggering.";
    }
    if (!hasN8nId && !hasWebhook) {
      return "Push this workflow to n8n first — file imports are not live on n8n until you push.";
    }
    if (hasN8nId && !hasAccountId) {
      return "Select an n8n instance above, then click Trigger.";
    }
    return "Missing required configuration to trigger.";
  })();

  const loadAccounts = useCallback(async () => {
    if (!token) return;
    try {
      const accounts = await listIntegrationAccounts(token, "n8n");
      setN8nAccounts(accounts.filter((a) => a.status === "active"));
      if (accounts[0] && !selectedAccount) {
        setSelectedAccount(accounts[0].id);
      }
    } catch {
      // Silently ignore — n8n accounts are optional
    }
  }, [token, selectedAccount]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const setMsg = (text: string, type: "info" | "error" | "success" = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const run = async (fn: () => Promise<void>) => {
    setIsBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      setMsg(msg, "error");
      toastError(err, "Operation failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleExport = () =>
    run(async () => {
      if (!token) return;
      const result = await exportN8nWorkflow(token, workflow.id);
      downloadN8nJson(`${workflow.name.replace(/\s+/g, "-")}-n8n.json`, result.n8n_workflow);
      setMsg("Exported n8n JSON downloaded", "success");
      toastSuccess("n8n workflow JSON exported");
      onUpdated?.({ ...workflow, n8n_metadata: result.n8n_metadata });
    });

  const handlePush = () => {
    if (!selectedAccount) {
      const msg = hasConnectedAccounts
        ? "Select an n8n instance to push to."
        : "Connect an n8n instance on the Integrations page first.";
      setMsg(msg, "error");
      return;
    }
    setIsPushing(true);
    void run(async () => {
      if (!token) return;
      const result = await pushWorkflowToN8n(token, workflow.id, selectedAccount, true);
      const activationNote =
        result.activated === true ? " and activated" : result.activated === false ? " (not activated)" : "";
      setMsg(`Pushed to n8n (ID: ${result.n8n_workflow_id}${activationNote})`, "success");
      toastSuccess(`Workflow pushed to n8n${activationNote}`);
      onUpdated?.({ ...workflow, n8n_metadata: result.n8n_metadata });
    }).finally(() => setIsPushing(false));
  };

  const handleTrigger = () => {
    // Guard against sending an invalid request
    if (!canTrigger) {
      const reason = triggerDisabledReason ?? "Cannot trigger this workflow.";
      setMsg(reason, "error");
      toastError(new Error(reason), "Trigger blocked");
      return;
    }

    void run(async () => {
      if (!token) return;
      const accountId = selectedAccount || meta.n8n_instance_id || undefined;
      const result = await triggerN8nWorkflow(
        token,
        workflow.id,
        {},
        accountId,
      );
      if (result.success) {
        setMsg("n8n workflow triggered successfully", "success");
        toastSuccess("n8n workflow triggered");
      } else {
        const errMsg = result.error ?? "Trigger failed";
        setMsg(errMsg, "error");
        toastError(new Error(errMsg), "Trigger failed");
      }
    });
  };

  const messageColor =
    messageType === "error"
      ? "text-destructive"
      : messageType === "success"
        ? "text-emerald-600 dark:text-emerald-500"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Workflow className="size-4" />
          n8n Integration
        </CardTitle>
        <CardDescription>Import, export, push, and trigger linked n8n workflows</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {meta.source && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Source: {meta.source}</Badge>
            {meta.n8n_workflow_id && (
              <Badge variant="secondary">n8n ID: {meta.n8n_workflow_id}</Badge>
            )}
            {meta.remote_name && <Badge variant="secondary">{meta.remote_name}</Badge>}
            {meta.last_triggered_at && (
              <Badge variant="outline" className="text-xs">
                Last triggered: {new Date(meta.last_triggered_at).toLocaleString()}
              </Badge>
            )}
          </div>
        )}

        {/* Explain why trigger is disabled for imported workflows */}
        {!canTrigger && isImportedFromN8n && triggerDisabledReason && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <div className="space-y-2">
              <p>{triggerDisabledReason}</p>
              {!hasConnectedAccounts ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" render={<Link href="/dashboard/integrations" />}>
                  Connect n8n
                </Button>
              ) : !hasN8nId ? (
                <p className="text-muted-foreground">
                  Steps: 1) Select your n8n instance below → 2) Push to n8n → 3) Trigger n8n
                </p>
              ) : null}
            </div>
          </div>
        )}

        {hasConnectedAccounts ? (
          <div className="space-y-2">
            <Label>n8n instance</Label>
            <Select value={selectedAccount} onValueChange={(v) => v && setSelectedAccount(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select instance" />
              </SelectTrigger>
              <SelectContent>
                {n8nAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : isImportedFromN8n ? (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            No n8n instance connected.{" "}
            <Link href="/dashboard/integrations" className="font-medium text-primary underline-offset-4 hover:underline">
              Connect n8n on Integrations
            </Link>{" "}
            to push and run this workflow.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={isBusy} onClick={() => void handleExport()}>
            {isBusy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Download className="mr-1.5 size-4" />}
            Export JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy || isPushing || !selectedAccount}
            onClick={handlePush}
          >
            {isPushing ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Upload className="mr-1.5 size-4" />}
            Push to n8n
          </Button>
          <TooltipProvider delay={200}>
            <Tooltip>
              <TooltipTrigger
                render={<span className="inline-flex" />}
              >
                  <Button
                    size="sm"
                    disabled={isBusy || !canTrigger}
                    onClick={handleTrigger}
                  >
                    {isBusy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Play className="mr-1.5 size-4" />}
                    Trigger n8n
                  </Button>
              </TooltipTrigger>
              {!canTrigger && triggerDisabledReason && (
                <TooltipContent className="max-w-xs text-xs" side="bottom">
                  {triggerDisabledReason}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {message && <p className={`text-sm ${messageColor}`}>{message}</p>}
      </CardContent>
    </Card>
  );
}

// Legacy connect card removed — use Integrations page n8n card instead.
