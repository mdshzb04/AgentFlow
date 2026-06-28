"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FormAlert } from "@/components/security/form-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  disconnectIntegration,
  testIntegration,
  updateN8nSettings,
  type IntegrationConnectionDetail,
} from "@/lib/integrations-platform";

export function N8nSettingsModal({
  open,
  onOpenChange,
  connectionId,
  detail,
  token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  detail?: IntegrationConnectionDetail | null;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [baseUrl, setBaseUrl] = useState(detail?.instance_url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateN8nSettings(token, connectionId, {
        base_url: baseUrl || undefined,
        api_key: apiKey || undefined,
      }),
    onSuccess: () => {
      toast.success("n8n settings saved");
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setApiKey("");
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to save settings");
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (baseUrl || apiKey) {
        await updateN8nSettings(token, connectionId, {
          base_url: baseUrl || undefined,
          api_key: apiKey || undefined,
        });
      }
      return testIntegration(token, connectionId);
    },
    onSuccess: (result) => {
      setTestResult(result.healthy ? `Connected${result.version ? ` (v${result.version})` : ""}` : result.message);
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (err) => {
      setTestResult(err instanceof ApiError ? err.message : "Test failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => disconnectIntegration(token, connectionId),
    onSuccess: () => {
      toast.success("n8n disconnected");
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>n8n Settings</DialogTitle>
          <DialogDescription>
            Configure your n8n instance. API keys are encrypted and never shown after saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && <FormAlert variant="error" message={error} />}
          {testResult && (
            <FormAlert
              variant={testResult.startsWith("Connected") ? "success" : "error"}
              message={testResult}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="n8n-base-url">Base URL</Label>
            <Input
              id="n8n-base-url"
              placeholder="https://n8n.example.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Advanced: your self-hosted or cloud n8n URL</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="n8n-api-key">API Key</Label>
            <Input
              id="n8n-api-key"
              type="password"
              placeholder={detail?.api_key_masked ? "••••••••••••••••" : "Enter API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            Delete Connection
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Test Connection
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function N8nConnectDialog({
  open,
  onOpenChange,
  token,
  defaultBaseUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  defaultBaseUrl?: string;
}) {
  const queryClient = useQueryClient();
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const connectMutation = useMutation({
    mutationFn: () =>
      import("@/lib/integrations-platform").then((m) =>
        m.connectN8n(token, baseUrl, apiKey),
      ),
    onSuccess: () => {
      toast.success("n8n connected");
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setApiKey("");
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Connection failed");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect n8n</DialogTitle>
          <DialogDescription>
            Link your n8n instance to import and sync workflows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && <FormAlert variant="error" message={error} />}

          <div className="space-y-2">
            <Label htmlFor="connect-base-url">n8n Base URL</Label>
            <Input
              id="connect-base-url"
              placeholder="https://your-name.app.n8n.cloud"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              n8n Cloud: <code className="text-[11px]">https://&lt;name&gt;.app.n8n.cloud</code>. Self-hosted: your public n8n URL. Local dev with Docker API: <code className="text-[11px]">http://host.docker.internal:5678</code>.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="connect-api-key">API Key</Label>
            <Input
              id="connect-api-key"
              type="password"
              placeholder="Paste your n8n API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => connectMutation.mutate()}
            disabled={!apiKey || !baseUrl.trim() || connectMutation.isPending}
          >
            {connectMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
