"use client";

import Link from "next/link";

import { AgentRunner } from "@/components/agents/agent-runner";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { History, Sparkles } from "lucide-react";

export default function AgentsPage() {
  const { token } = useAuth();

  return (
    <DashboardShell>
      <DashboardHeader
        title="AI Agents"
        description="Run OpenAI agents with prompt templates"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <Sparkles className="mb-2 size-5 text-violet-500" />
              <CardTitle className="text-base">Prompt Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Lead qualification, email generation, and meeting summaries built-in.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <History className="mb-2 size-5 text-emerald-500" />
              <CardTitle className="text-base">Execution History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <CardDescription>Every run is logged with inputs, outputs, and tool calls.</CardDescription>
              <Button variant="outline" size="sm" render={<Link href="/dashboard/agents/executions" />}>
                View History
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Run Agent</CardTitle>
            <CardDescription>
              Select a template, fill in variables, and execute with JSON output and function calling.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {token && <AgentRunner token={token} />}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
