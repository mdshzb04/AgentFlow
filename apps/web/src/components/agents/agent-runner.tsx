"use client";

import { useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";

import { ExecutionCard } from "@/components/agents/execution-card";
import { VoiceInput } from "@/components/agents/voice-input";
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
import { listTemplates, runAgent } from "@/lib/agent";
import type { AgentExecution, LLMProvider, PromptTemplate } from "@/types/agent";
import { TEMPLATE_VARIABLES } from "@/types/agent";

interface AgentRunnerProps {
  token: string;
  onExecuted?: (execution: AgentExecution) => void;
}

export function AgentRunner({ token, onExecuted }: AgentRunnerProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("lead_qualification");
  const [provider, setProvider] = useState<LLMProvider>("openai");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExecution, setLastExecution] = useState<AgentExecution | null>(null);

  const selectedTemplate = templates.find((t) => t.slug === selectedSlug);

  useEffect(() => {
    listTemplates(token)
      .then(setTemplates)
      .catch(() => setError("Failed to load templates"));
  }, [token]);

  useEffect(() => {
    const fields = TEMPLATE_VARIABLES[selectedSlug] ?? [];
    const defaults: Record<string, string> = {};
    for (const field of fields) {
      const key = field.label.toLowerCase().replace(/\s+/g, "_");
      defaults[key] = variables[key] ?? "";
    }
    setVariables(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  useEffect(() => {
    if (selectedTemplate?.default_provider === "openai") {
      setProvider("openai");
    } else {
      setProvider("openai");
    }
  }, [selectedTemplate]);

  const handleRun = async (spokenText?: string) => {
    setIsRunning(true);
    setError(null);
    const payloadVars =
      selectedSlug === "voice_crm_assistant"
        ? { ...variables, user_message: spokenText ?? variables.user_message ?? "" }
        : variables;
    try {
      const execution = await runAgent(token, {
        provider,
        template: selectedSlug,
        variables: payloadVars,
        input: payloadVars,
        output_mode: selectedTemplate?.output_mode,
      });
      setLastExecution(execution);
      onExecuted?.(execution);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setIsRunning(false);
    }
  };

  const fields = TEMPLATE_VARIABLES[selectedSlug] ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Template</Label>
          <Select
            value={selectedSlug}
            onValueChange={(v) => v && setSelectedSlug(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.slug} value={t.slug}>
                  {t.name}
                  {t.is_builtin && " (built-in)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate?.description && (
            <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={provider}
            onValueChange={(v) => v && setProvider(v as LLMProvider)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedSlug === "voice_crm_assistant" && (
        <VoiceInput
          token={token}
          value={variables.user_message ?? ""}
          onChange={(text) => setVariables((v) => ({ ...v, user_message: text }))}
          onSubmit={(text) => void handleRun(text)}
          disabled={isRunning}
          autoSubmit
        />
      )}

      {fields.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => {
            const key = field.label.toLowerCase().replace(/\s+/g, "_");
            const isLong = field.label === "Transcript" || field.label === "Notes";
            return (
              <div key={key} className={isLong ? "sm:col-span-2" : ""}>
                <Label htmlFor={key}>{field.label}</Label>
                {isLong ? (
                  <Textarea
                    id={key}
                    value={variables[key] ?? ""}
                    onChange={(e) =>
                      setVariables((v) => ({ ...v, [key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    rows={4}
                    className="mt-1.5"
                  />
                ) : (
                  <Input
                    id={key}
                    value={variables[key] ?? ""}
                    onChange={(e) =>
                      setVariables((v) => ({ ...v, [key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="mt-1.5"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button onClick={() => void handleRun()} disabled={isRunning}>
        {isRunning ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Play className="mr-2 size-4" />
        )}
        Run Agent
      </Button>

      {lastExecution && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Latest Result</h3>
          <ExecutionCard execution={lastExecution} />
        </div>
      )}
    </div>
  );
}
