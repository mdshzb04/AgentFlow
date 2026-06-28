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
import { listTemplates } from "@/lib/agent";
import type { AiNodeConfig, LLMProvider, PromptTemplate } from "@/types/agent";

interface AiNodePanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, config: AiNodeConfig, label?: string) => void;
  token: string;
}

export function AiNodePanel({ node, onUpdate, token }: AiNodePanelProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);

  useEffect(() => {
    listTemplates(token).then(setTemplates).catch(() => {});
  }, [token]);

  const config = useMemo(
    () => (node?.data as { config?: AiNodeConfig })?.config ?? {},
    [node],
  );

  const update = useCallback(
    (patch: Partial<AiNodeConfig>) => {
      if (!node) return;
      const newConfig = { ...config, ...patch };
      const template = templates.find((t) => t.slug === newConfig.template);
      onUpdate(
        node.id,
        newConfig,
        template ? template.name : (node.data as { label?: string }).label,
      );
    },
    [node, config, templates, onUpdate],
  );

  if (!node || node.type !== "ai") {
    return (
      <aside className="flex w-64 shrink-0 flex-col border-l bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Select an AI node to configure provider, template, and output settings.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l bg-muted/30">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">AI Node Config</h2>
        <p className="text-xs text-muted-foreground">{(node.data as { label?: string }).label}</p>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="space-y-2">
          <Label>Template</Label>
          <Select
            value={config.template ?? ""}
            onValueChange={(v) => v && update({ template: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.slug} value={t.slug}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={config.provider ?? "openai"}
            onValueChange={(v) => v && update({ provider: v as LLMProvider })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Claude</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Model (optional)</Label>
          <input
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            value={config.model ?? ""}
            onChange={(e) => update({ model: e.target.value || undefined })}
            placeholder="gpt-4o / claude-sonnet-4-..."
          />
        </div>

        <div className="space-y-2">
          <Label>Output Mode</Label>
          <Select
            value={config.outputMode ?? "json"}
            onValueChange={(v) => v && update({ outputMode: v as "text" | "json" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Temperature</Label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.temperature ?? 0.7}
            onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <span className="text-xs text-muted-foreground">
            {(config.temperature ?? 0.7).toFixed(1)}
          </span>
        </div>
      </div>
    </aside>
  );
}
