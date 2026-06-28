"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Node } from "@xyflow/react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listIntegrationAccounts } from "@/lib/integrations";
import type { IntegrationAccount, IntegrationProvider } from "@/types/integrations";

const PROVIDER_FOR_NODE: Record<string, IntegrationProvider | null> = {
  gmail: "gmail",
  google_sheets: "google_sheets",
  webhook: "webhook",
};

interface IntegrationNodePanelProps {
  node: Node | null;
  token: string;
  onUpdate: (nodeId: string, config: Record<string, unknown>) => void;
}

export function IntegrationNodePanel({ node, token, onUpdate }: IntegrationNodePanelProps) {
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);

  useEffect(() => {
    listIntegrationAccounts(token).then(setAccounts).catch(() => {});
  }, [token]);

  const config = useMemo(
    () => (node?.data as { config?: Record<string, unknown> })?.config ?? {},
    [node],
  );

  const update = useCallback(
    (patch: Record<string, unknown>) => {
      if (!node) return;
      onUpdate(node.id, { ...config, ...patch });
    },
    [node, config, onUpdate],
  );

  if (!node || !PROVIDER_FOR_NODE[node.type ?? ""]) {
    return null;
  }

  const provider = PROVIDER_FOR_NODE[node.type!];
  const filtered = accounts.filter((a) => a.provider === provider && a.status === "active");
  const nodeType = node.type!;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l bg-muted/30">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold capitalize">{nodeType.replace(/_/g, " ")} Config</h2>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {nodeType !== "webhook" || config.direction !== "outbound" ? (
          nodeType !== "webhook" && (
            <div className="space-y-2">
              <Label>Connected Account</Label>
              <Select
                value={(config.connectionId as string) ?? ""}
                onValueChange={(v) => v && update({ connectionId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {filtered.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Connect an account in Integrations settings.
                </p>
              )}
            </div>
          )
        ) : null}

        {nodeType === "gmail" && (
          <>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={(config.action as string) ?? "send"}
                onValueChange={(v) => v && update({ action: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="send">Send Email</SelectItem>
                  <SelectItem value="read">Read Emails</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input value={(config.to as string) ?? ""} onChange={(e) => update({ to: e.target.value })} placeholder="{{email}}" />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={(config.subject as string) ?? ""} onChange={(e) => update({ subject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea value={(config.body as string) ?? ""} onChange={(e) => update({ body: e.target.value })} rows={3} placeholder="Use {{variable}} from context" />
            </div>
          </>
        )}

        {nodeType === "google_sheets" && (
          <>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={(config.action as string) ?? "append"}
                onValueChange={(v) => v && update({ action: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">Append Row</SelectItem>
                  <SelectItem value="read">Read Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Spreadsheet ID</Label>
              <Input value={(config.spreadsheetId as string) ?? ""} onChange={(e) => update({ spreadsheetId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Range</Label>
              <Input value={(config.range as string) ?? "Sheet1!A1"} onChange={(e) => update({ range: e.target.value })} />
            </div>
          </>
        )}

        {nodeType === "webhook" && (
          <>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select
                value={(config.direction as string) ?? "outbound"}
                onValueChange={(v) => v && update({ direction: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound (call URL)</SelectItem>
                  <SelectItem value="inbound">Inbound (receive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.direction !== "inbound" && (
              <>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={(config.url as string) ?? ""} onChange={(e) => update({ url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={(config.method as string) ?? "POST"}
                    onValueChange={(v) => v && update({ method: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
