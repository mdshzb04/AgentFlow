"use client";

import type { Node } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface CrmNodeConfig {
  entity: string;
  action: "create" | "update";
  recordId?: string;
  fields: Record<string, string>;
}

interface CrmNodePanelProps {
  node: Node;
  onUpdate: (nodeId: string, config: CrmNodeConfig, label?: string) => void;
}

const ENTITIES = ["lead", "contact", "company", "deal", "task", "note"];

const DEFAULT_FIELDS: Record<string, Record<string, string>> = {
  lead: {
    title: "{{name}}",
    email: "{{email}}",
    source: "{{source}}",
    score: "{{score}}",
    status: "qualified",
    notes_summary: "{{next_action}}",
  },
  contact: {
    first_name: "{{name}}",
    last_name: "",
    email: "{{email}}",
    title: "{{title}}",
  },
  deal: {
    name: "{{name}} — Deal",
    amount: "{{value}}",
    stage: "qualification",
  },
  task: {
    title: "{{next_action}}",
    description: "{{last_ai_output}}",
    priority: "medium",
  },
  note: {
    body: "{{last_ai_output}}",
    related_type: "lead",
    related_id: "{{last_lead_id}}",
  },
  company: {
    name: "{{company}}",
    industry: "{{industry}}",
  },
};

export function CrmNodePanel({ node, onUpdate }: CrmNodePanelProps) {
  const config = (node.data.config ?? {}) as CrmNodeConfig;
  const entity = config.entity ?? "lead";
  const action = config.action ?? "create";
  const fields = config.fields ?? DEFAULT_FIELDS.lead;
  const fieldsJson = JSON.stringify(fields, null, 2);

  const apply = (patch: Partial<CrmNodeConfig>, label?: string) => {
    onUpdate(
      node.id,
      {
        entity,
        action,
        recordId: config.recordId,
        fields,
        ...patch,
      },
      label,
    );
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l bg-muted/30 p-4">
      <div>
        <h3 className="font-semibold">CRM Action</h3>
        <p className="text-xs text-muted-foreground">
          Create or update CRM records using workflow context variables.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Entity</Label>
        <Select
          value={entity}
          onValueChange={(v) => {
            if (!v) return;
            apply(
              {
                entity: v,
                fields: DEFAULT_FIELDS[v] ?? {},
              },
              `CRM ${v}`,
            );
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITIES.map((e) => (
              <SelectItem key={e} value={e}>
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Action</Label>
        <Select
          value={action}
          onValueChange={(v) => {
            if (v) apply({ action: v as "create" | "update" });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {action === "update" && (
        <div className="space-y-2">
          <Label>Record ID</Label>
          <Input
            value={config.recordId ?? ""}
            onChange={(e) => apply({ recordId: e.target.value })}
            placeholder="{{last_lead_id}}"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Fields (JSON)</Label>
        <Textarea
          className="font-mono text-xs"
          rows={12}
          defaultValue={fieldsJson}
          onBlur={(e) => {
            try {
              const parsed = JSON.parse(e.target.value) as Record<string, string>;
              apply({ fields: parsed });
            } catch {
              // keep previous on invalid JSON
            }
          }}
        />
        <p className="text-[10px] text-muted-foreground">
          Use {"{{variable}}"} to map from workflow context (e.g. AI output).
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => apply({ fields: DEFAULT_FIELDS[entity] ?? {} })}
      >
        Reset to defaults
      </Button>
    </aside>
  );
}
