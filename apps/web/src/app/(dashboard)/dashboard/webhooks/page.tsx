"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

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
  DialogFooter,
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
import { ApiError } from "@/lib/api";
import {
  createWebhook,
  deleteWebhook,
  listWebhookLogs,
  listWebhooks,
  retryWebhookLog,
  rotateWebhookSecret,
  type WebhookEndpoint,
  type WebhookLog,
} from "@/lib/webhooks";

export default function WebhooksPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"incoming" | "outgoing">("incoming");
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");

  const { data: endpoints = [], isLoading } = useQuery({
    queryKey: ["webhooks", token],
    queryFn: () => listWebhooks(token!),
    enabled: !!token,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["webhook-logs", token],
    queryFn: () => listWebhookLogs(token!),
    enabled: !!token,
  });

  const incoming = endpoints.filter((e) => e.direction === "incoming");
  const outgoing = endpoints.filter((e) => e.direction === "outgoing");
  const failedLogs = logs.filter((l) => l.status === "failed");

  const createMutation = useMutation({
    mutationFn: () =>
      createWebhook(token!, {
        name,
        direction,
        target_url: direction === "outgoing" ? targetUrl : undefined,
      }),
    onSuccess: (data) => {
      if (data.secret) setNewSecret(data.secret);
      toast.success("Webhook created");
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setName("");
      setTargetUrl("");
      setCreateOpen(false);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to create webhook"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWebhook(token!, id),
    onSuccess: (_data, id) => {
      toast.success("Webhook deleted");
      queryClient.setQueryData<WebhookEndpoint[]>(["webhooks", token], (old) =>
        old?.filter((e) => e.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to delete webhook"),
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => rotateWebhookSecret(token!, id),
    onSuccess: (data) => {
      setNewSecret(data.secret);
      toast.success("Secret rotated");
    },
  });

  const retryMutation = useMutation({
    mutationFn: (logId: string) => retryWebhookLog(token!, logId),
    onSuccess: () => {
      toast.success("Retry queued");
      void queryClient.invalidateQueries({ queryKey: ["webhook-logs"] });
    },
  });

  const copyUrl = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("URL copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <DashboardShell>
      <DashboardHeader
        title="Webhooks"
        description="Manage incoming and outgoing webhook endpoints"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            New Webhook
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {newSecret && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Webhook Secret</CardTitle>
              <CardDescription>
                Copy this secret now — it will not be shown again. Send as header: X-Webhook-Secret
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs break-all">{newSecret}</code>
              <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(newSecret)}>
                <Copy className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNewSecret(null)}>
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="incoming">
          <TabsList>
            <TabsTrigger value="incoming">Incoming ({incoming.length})</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing ({outgoing.length})</TabsTrigger>
            <TabsTrigger value="deliveries">Recent Deliveries</TabsTrigger>
            <TabsTrigger value="failed">Failed ({failedLogs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-4">
            <EndpointList
              endpoints={incoming}
              isLoading={isLoading}
              copiedId={copiedId}
              onCopy={copyUrl}
              onDelete={(id) => deleteMutation.mutate(id)}
              onRotate={(id) => rotateMutation.mutate(id)}
            />
          </TabsContent>
          <TabsContent value="outgoing" className="mt-4">
            <EndpointList
              endpoints={outgoing}
              isLoading={isLoading}
              copiedId={copiedId}
              onCopy={copyUrl}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          </TabsContent>
          <TabsContent value="deliveries" className="mt-4">
            <LogList
              logs={logs.filter((l) => l.status === "success").slice(0, 20)}
              isLoading={logsLoading}
            />
          </TabsContent>
          <TabsContent value="failed" className="mt-4">
            <LogList
              logs={failedLogs}
              isLoading={logsLoading}
              onRetry={(id) => retryMutation.mutate(id)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Webhook" />
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => v && setDirection(v as "incoming" | "outgoing")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {direction === "outgoing" && (
              <div className="space-y-2">
                <Label>Target URL</Label>
                <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://api.example.com/hook" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function EndpointList({
  endpoints,
  isLoading,
  copiedId,
  onCopy,
  onDelete,
  onRotate,
}: {
  endpoints: WebhookEndpoint[];
  isLoading: boolean;
  copiedId: string | null;
  onCopy: (url: string, id: string) => void;
  onDelete: (id: string) => void;
  onRotate?: (id: string) => void;
}) {
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (endpoints.length === 0) {
    return (
      <Card><CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <Webhook className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No webhooks yet</p>
      </CardContent></Card>
    );
  }
  return (
    <div className="space-y-3">
      {endpoints.map((ep) => (
        <Card key={ep.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{ep.name}</p>
              <code className="mt-1 block text-xs text-muted-foreground break-all">{ep.url ?? ep.target_url}</code>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={ep.is_active ? "default" : "secondary"}>{ep.is_active ? "Active" : "Inactive"}</Badge>
              {ep.url && (
                <Button size="sm" variant="outline" onClick={() => onCopy(ep.url!, ep.id)}>
                  {copiedId === ep.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              )}
              {onRotate && ep.direction === "incoming" && (
                <Button size="sm" variant="outline" onClick={() => onRotate(ep.id)} title="Rotate secret">
                  <RotateCcw className="size-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Delete?")) onDelete(ep.id); }}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LogList({
  logs,
  isLoading,
  onRetry,
}: {
  logs: WebhookLog[];
  isLoading: boolean;
  onRetry?: (id: string) => void;
}) {
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (logs.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No deliveries yet</p>;
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div>
              <Badge variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                {log.status}
              </Badge>
              <span className="ml-2 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </span>
              {log.error_message && <p className="mt-1 text-xs text-destructive">{log.error_message}</p>}
            </div>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={() => onRetry(log.id)}>
                <RefreshCw className="mr-1 size-3" /> Retry
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
