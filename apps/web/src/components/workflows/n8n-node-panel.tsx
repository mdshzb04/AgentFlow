"use client";

import type { Node } from "@xyflow/react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { listIntegrationAccounts } from "@/lib/integrations";
import { listN8nRemoteWorkflows } from "@/lib/n8n";
import { useAuth } from "@/components/providers/auth-provider";
import type { N8nNodeConfig } from "@/types/n8n";

interface N8nNodePanelProps {
  node: Node;
  onUpdate: (nodeId: string, config: N8nNodeConfig, label?: string) => void;
}

export function N8nNodePanel({ node, onUpdate }: N8nNodePanelProps) {
  const { token } = useAuth();
  const config = (node.data.config ?? {}) as N8nNodeConfig;
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [remotes, setRemotes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!token) return;
    void listIntegrationAccounts(token, "n8n").then((a) =>
      setAccounts(a.filter((x) => x.status === "active").map((x) => ({ id: x.id, name: x.name }))),
    );
  }, [token]);

  useEffect(() => {
    if (!token || !config.connectionId) return;
    void listN8nRemoteWorkflows(token, config.connectionId).then(setRemotes).catch(() => setRemotes([]));
  }, [token, config.connectionId]);

  const apply = (patch: Partial<N8nNodeConfig>, label?: string) => {
    onUpdate(node.id, { ...config, ...patch }, label);
  };

  const payloadJson = JSON.stringify(config.payload ?? { input: "{{last_ai_output}}" }, null, 2);

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l bg-muted/30 p-4">
      <div>
        <h3 className="font-semibold">n8n Trigger</h3>
        <p className="text-xs text-muted-foreground">
          Execute an n8n workflow via API or webhook with workflow context.
        </p>
      </div>

      <div className="space-y-2">
        <Label>n8n instance</Label>
        <Select
          value={config.connectionId ?? ""}
          onValueChange={(v) => v && apply({ connectionId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select connection" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Remote workflow</Label>
        <Select
          value={config.n8nWorkflowId ?? ""}
          onValueChange={(v) => v && apply({ n8nWorkflowId: v }, `n8n ${v.slice(0, 8)}`)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select workflow" />
          </SelectTrigger>
          <SelectContent>
            {remotes.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Webhook URL (optional)</Label>
        <Input
          value={config.webhookUrl ?? ""}
          onChange={(e) => apply({ webhookUrl: e.target.value })}
          placeholder="https://n8n.example.com/webhook/..."
        />
      </div>

      <div className="space-y-2">
        <Label>Payload (JSON)</Label>
        <Textarea
          className="font-mono text-xs"
          rows={8}
          defaultValue={payloadJson}
          onBlur={(e) => {
            try {
              apply({ payload: JSON.parse(e.target.value) as Record<string, string> });
            } catch {
              // ignore invalid JSON
            }
          }}
        />
      </div>
    </aside>
  );
}
