"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Loader2,
  Pencil,
  Rocket,
  Sparkles,
  Wand2,
} from "lucide-react";

import { AutomationPreview } from "@/components/automation/automation-preview";
import { VoiceInput } from "@/components/agents/voice-input";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  buildAutomation,
  deployAutomation,
  type AutomationPlan,
} from "@/lib/automation-builder";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPTS = [
  "When a new lead is created, send a follow-up email with AI",
  "Qualify incoming leads with AI and create CRM records",
  "Generate a follow-up email with AI and save it to CRM",
  "Daily summary of open deals emailed to the team",
];

interface AutomationBuilderPanelProps {
  onDeployed?: () => void;
}

export function AutomationBuilderPanel({ onDeployed }: AutomationBuilderPanelProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<AutomationPlan | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleBuild = async (text?: string) => {
    const value = (text ?? prompt).trim();
    if (!token || !value) return;
    setPrompt(value);
    setIsBuilding(true);
    setPlan(null);
    try {
      const result = await buildAutomation(token, value);
      setPlan(result.plan);
    } catch (err) {
      toastError(err, "Failed to generate automation");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleDeploy = async () => {
    if (!token || !plan) return;
    setIsDeploying(true);
    try {
      const result = await deployAutomation(token, plan, true);
      toastSuccess(result.message);
      onDeployed?.();
      router.push(`/dashboard/workflows/${result.workflow_id}`);
    } catch (err) {
      toastError(err, "Failed to deploy automation");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Card className="overflow-hidden border-border/60 bg-gradient-to-b from-card/80 to-card/40">
      <CardHeader className="border-b border-border/40 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <CardTitle className="text-xl">AI Automation Builder</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Describe what you want in plain English — or speak it. AgentFlow will
              generate the workflow, schedule, triggers, and integrations for you.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Try: "When a new lead is created, email the team" or "Qualify leads with AI"'
            rows={4}
            className="resize-none border-border/60 bg-background/60 pr-4 text-base leading-relaxed"
            disabled={isBuilding}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleBuild();
              }
            }}
          />
          {token && (
            <div className="mt-3">
              <VoiceInput
                token={token}
                value={prompt}
                onChange={setPrompt}
                onSubmit={(text) => void handleBuild(text)}
                disabled={isBuilding}
                autoSubmit
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal py-2 text-left text-xs"
              disabled={isBuilding}
              onClick={() => {
                setPrompt(example);
                void handleBuild(example);
              }}
            >
              <Wand2 className="mr-1.5 size-3.5 shrink-0" />
              {example}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void handleBuild()}
            disabled={isBuilding || !prompt.trim()}
          >
            {isBuilding ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Bot className="mr-2 size-4" />
            )}
            Generate automation
          </Button>
          {plan && (
            <>
              <Button
                variant="secondary"
                onClick={() => void handleDeploy()}
                disabled={isDeploying}
              >
                {isDeploying ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 size-4" />
                )}
                Deploy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPlan(null)}
              >
                <Pencil className="mr-1.5 size-3.5" />
                Edit prompt
              </Button>
            </>
          )}
        </div>

        {plan && (
          <div
            className={cn(
              "rounded-xl border border-border/60 bg-background/40 p-4",
              isDeploying && "pointer-events-none opacity-60",
            )}
          >
            <AutomationPreview plan={plan} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
