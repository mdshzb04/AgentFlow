"use client";

import { useCallback, useMemo, useState } from "react";
import type { Node } from "@xyflow/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getN8nNodeMetadata } from "@/lib/n8n-node-registry";
import { toastError, toastSuccess } from "@/lib/toast";
import type { WorkflowNode } from "@/types/workflow";

interface N8nNativeNodePanelProps {
  node: Node;
  onUpdate: (nodeId: string, config: Record<string, unknown>, label?: string) => void;
}

export function N8nNativeNodePanel({ node, onUpdate }: N8nNativeNodePanelProps) {
  const wfNode = node as WorkflowNode;
  const config = (wfNode.data?.config ?? {}) as Record<string, unknown>;
  const n8nType = String(config.n8nType ?? wfNode.data?.n8nType ?? "");
  const meta = getN8nNodeMetadata(n8nType);

  const initialJson = useMemo(
    () => JSON.stringify(config.n8nParameters ?? {}, null, 2),
    [config.n8nParameters],
  );
  const [paramsJson, setParamsJson] = useState(initialJson);
  const [snapshotJson, setSnapshotJson] = useState(
    () => JSON.stringify(config.n8nSnapshot ?? {}, null, 2),
  );

  const handleSaveParams = useCallback(() => {
    try {
      const parsed = JSON.parse(paramsJson) as Record<string, unknown>;
      const snapshot =
        typeof config.n8nSnapshot === "object" && config.n8nSnapshot !== null
          ? { ...(config.n8nSnapshot as Record<string, unknown>), parameters: parsed }
          : { parameters: parsed, type: n8nType };
      onUpdate(node.id, {
        ...config,
        n8nParameters: parsed,
        n8nSnapshot: snapshot,
      });
      setSnapshotJson(JSON.stringify(snapshot, null, 2));
      toastSuccess("Node parameters saved");
    } catch {
      toastError(new Error("Invalid JSON"), "Could not save parameters");
    }
  }, [config, n8nType, node.id, onUpdate, paramsJson]);

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l bg-muted/30 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">n8n Node</p>
        <h3 className="mt-1 text-base font-semibold">{meta.displayName}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{wfNode.data?.label}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{meta.category}</Badge>
        {meta.official ? (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
            Official
          </Badge>
        ) : (
          <Badge variant="outline" className="border-zinc-500/40">
            Community
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Node type</Label>
        <code className="block break-all rounded-md bg-muted px-2 py-1.5 text-[11px]">{n8nType}</code>
      </div>

      <div className="space-y-2">
        <Label htmlFor="n8n-params">Parameters (JSON)</Label>
        <Textarea
          id="n8n-params"
          value={paramsJson}
          onChange={(e) => setParamsJson(e.target.value)}
          rows={12}
          className="font-mono text-xs"
          spellCheck={false}
        />
        <Button size="sm" onClick={handleSaveParams}>
          Save parameters
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Original n8n node (read-only)</Label>
        <Textarea
          value={snapshotJson}
          readOnly
          rows={8}
          className="font-mono text-[10px] opacity-80"
        />
      </div>
    </aside>
  );
}
