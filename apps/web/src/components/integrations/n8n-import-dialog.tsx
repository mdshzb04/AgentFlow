"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileJson,
  Loader2,
  Network,
  Upload,
} from "lucide-react";

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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { importN8nWorkflow, listN8nRemoteWorkflows } from "@/lib/n8n";
import {
  readN8nWorkflowFile,
  validateN8nWorkflow,
  type N8nValidationResult,
} from "@/lib/n8n-import";
import { useAuth } from "@/components/providers/auth-provider";
import { getErrorMessage, toastError, toastSuccess } from "@/lib/toast";

type N8nImportDialogProps = {
  onImported?: (workflowId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  accountId?: string;
  token?: string;
};

type FileStatus = "idle" | "reading" | "invalid" | "ready";

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function N8nImportDialog({
  onImported,
  open,
  onOpenChange,
  accountId: fixedAccountId,
  token: fixedToken,
}: N8nImportDialogProps) {
  const [accountId, setAccountId] = useState(fixedAccountId ?? "");
  const [remoteId, setRemoteId] = useState("");
  const [remotes, setRemotes] = useState<{ id: string; name: string }[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileStatus, setFileStatus] = useState<FileStatus>("idle");
  const [validation, setValidation] = useState<N8nValidationResult | null>(null);
  const parsedDataRef = useRef<Record<string, unknown> | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { token: authToken } = useAuth();
  const token = fixedToken ?? authToken;
  const effectiveAccountId = fixedAccountId ?? accountId;
  const isControlled = open !== undefined && onOpenChange !== undefined;

  useEffect(() => {
    if (fixedAccountId) setAccountId(fixedAccountId);
  }, [fixedAccountId]);

  useEffect(() => {
    if (!token || !effectiveAccountId) {
      setRemotes([]);
      return;
    }
    setRemoteLoading(true);
    void listN8nRemoteWorkflows(token, effectiveAccountId)
      .then(setRemotes)
      .catch(() => setRemotes([]))
      .finally(() => setRemoteLoading(false));
  }, [token, effectiveAccountId]);

  const resetState = useCallback(() => {
    setFileName(null);
    setFileStatus("idle");
    setValidation(null);
    parsedDataRef.current = null;
    setRemoteId("");
    setError(null);
    setSuccess(null);
    setIsImporting(false);
  }, []);

  useEffect(() => {
    if (isControlled && open === false) {
      resetState();
    }
  }, [isControlled, open, resetState]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later.
    e.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setFileStatus("reading");
    setValidation(null);
    parsedDataRef.current = null;
    setError(null);
    setSuccess(null);

    try {
      const data = await readN8nWorkflowFile(file);
      const result = validateN8nWorkflow(data, file.name.replace(/\.json$/i, ""));
      parsedDataRef.current = result.data;
      setValidation(result);
      setFileStatus(result.valid ? "ready" : "invalid");
      if (!result.valid) {
        setError(result.errors.join(" "));
      }
    } catch (err) {
      setFileStatus("invalid");
      setValidation(null);
      setError(getErrorMessage(err, "Could not read JSON file."));
    }
  };

  const finishImport = (result: {
    workflow_id: string;
    name: string;
    nodes_imported: number;
    connections_imported?: number;
    n8n_native_count?: number;
    community_count?: number;
    unsupported_count?: number;
    created?: boolean;
  }) => {
    const verb = result.created === false ? "Updated" : "Imported";
    const connCount = result.connections_imported ?? 0;
    const message = `Workflow ${verb.toLowerCase()} successfully • ${result.nodes_imported} node${
      result.nodes_imported === 1 ? "" : "s"
    } • ${connCount} connection${connCount === 1 ? "" : "s"}`;
    setSuccess(message);
    toastSuccess(message);

    if (result.community_count && result.community_count > 0) {
      setTimeout(() => {
        toastSuccess(
          `${result.community_count} community node type${result.community_count === 1 ? "" : "s"} imported with compatibility wrappers.`,
        );
      }, 400);
    }

    onImported?.(result.workflow_id);
    onOpenChange?.(false);
    resetState();
  };

  const handleFileImport = async () => {
    const data = parsedDataRef.current;
    if (!data || !validation?.valid) return;
    if (!token) {
      setError("Sign in to import workflows.");
      return;
    }
    setIsImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await importN8nWorkflow(token, {
        account_id: effectiveAccountId || undefined,
        workflow_json: data,
        name: validation.preview?.name,
      });
      finishImport(result);
    } catch (err) {
      const message = getErrorMessage(err, "Import failed");
      setError(message);
      toastError(err, "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoteImport = async () => {
    if (!token || !effectiveAccountId || !remoteId) return;
    setIsImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await importN8nWorkflow(token, {
        account_id: effectiveAccountId,
        n8n_workflow_id: remoteId,
      });
      finishImport(result);
    } catch (err) {
      const message = getErrorMessage(err, "Import failed");
      setError(message);
      toastError(err, "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const content = (
    <div className="space-y-4">
      <Tabs defaultValue="file">
        <TabsList className="w-full">
          <TabsTrigger value="file">
            <FileJson className="mr-1.5 size-3.5" />
            Upload JSON
          </TabsTrigger>
          <TabsTrigger value="remote">
            <Network className="mr-1.5 size-3.5" />
            From n8n instance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="n8n-file">n8n workflow JSON file</Label>
            <Input
              id="n8n-file"
              type="file"
              accept="application/json,.json"
              disabled={isImporting}
              onChange={(e) => void handleFileChange(e)}
            />
            <p className="text-xs text-muted-foreground">
              Export a workflow from n8n and upload the JSON here. No n8n connection required.
            </p>
          </div>

          {fileStatus === "reading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Parsing workflow…
            </div>
          )}

          {fileStatus === "invalid" && validation && (
            <Card className="border-destructive/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <AlertCircle className="size-4" />
                  Invalid workflow
                </CardTitle>
                <CardDescription>The file could not be validated as an n8n workflow.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {validation.errors.map((err) => (
                  <p key={err} className="text-sm text-destructive">
                    • {err}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {fileStatus === "invalid" && !validation && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {fileStatus === "ready" && validation?.preview && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  {validation.preview.name}
                </CardTitle>
                <CardDescription>
                  {fileName ? `From ${fileName}` : "Ready to import"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <PreviewRow label="Nodes" value={validation.preview.nodeCount} />
                <PreviewRow label="Connections" value={validation.preview.connectionCount} />
                <PreviewRow label="Trigger" value={validation.preview.trigger} />
                <PreviewRow
                  label="n8n compatible"
                  value={
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {validation.preview.nodeCount} node
                      {validation.preview.nodeCount === 1 ? "" : "s"}
                    </span>
                  }
                />
                {validation.preview.communityTypes.length > 0 && (
                  <PreviewRow
                    label="Community"
                    value={
                      <span className="text-muted-foreground">
                        {validation.preview.communityTypes.length} type
                        {validation.preview.communityTypes.length === 1 ? "" : "s"}
                      </span>
                    }
                  />
                )}
                {validation.warnings.map((w) => (
                  <p key={w} className="pt-1 text-xs text-amber-600 dark:text-amber-500">
                    {w}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isImporting || fileStatus !== "ready"}
              onClick={() => void handleFileImport()}
            >
              {isImporting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 size-4" />
              )}
              Import workflow
            </Button>
            {fileName && fileStatus === "idle" && (
              <span className="text-xs text-muted-foreground">{fileName}</span>
            )}
          </div>
        </TabsContent>

        <TabsContent value="remote" className="mt-4 space-y-3">
          {!effectiveAccountId ? (
            <p className="text-sm text-muted-foreground">
              Connect an n8n instance on the Integrations page to pull remote workflows.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Remote workflow</Label>
                <Select value={remoteId} onValueChange={(v) => v && setRemoteId(v)}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        remoteLoading ? "Loading…" : "Select remote workflow"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {remotes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {remotes.length === 0 && !remoteLoading && (
                  <p className="text-xs text-muted-foreground">No remote workflows found.</p>
                )}
              </div>
              <Button
                size="sm"
                disabled={isImporting || !remoteId}
                onClick={() => void handleRemoteImport()}
              >
                {isImporting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Import selected
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>

      {error && fileStatus !== "invalid" && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {success && !error && (
        <p className="text-sm text-emerald-600 dark:text-emerald-500">{success}</p>
      )}
    </div>
  );

  // FIXED: The content block above was returned early, making this unreachable.
  // Now content is a variable used below in both controlled (dialog) and
  // uncontrolled (inline) modes.
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from n8n</DialogTitle>
            <DialogDescription>
              Upload an n8n workflow JSON file or pull from a connected n8n instance.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}
