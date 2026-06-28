"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Brain, Target, TrendingUp, Zap } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalyticsOverview } from "@/lib/analytics";
import type { AnalyticsSummary } from "@/types/analytics";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

function formatCurrency(n: number) {
  const useMicro = Math.abs(n) > 0 && Math.abs(n) < 0.01;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: useMicro ? 6 : 2,
    maximumFractionDigits: useMicro ? 6 : 2,
  }).format(n);
}

function DashboardContent({ summary }: { summary: AnalyticsSummary | null }) {
  const { user } = useAuth();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Workflow Runs"
          value={summary ? String(summary.workflow_runs) : "—"}
          description={
            summary ? `${summary.workflow_success_rate}% success (30d)` : "Last 30 days"
          }
          icon={Zap}
        />
        <StatCard
          title="AI Requests"
          value={summary ? String(summary.ai_requests) : "—"}
          description={summary ? `${summary.total_tokens.toLocaleString()} tokens` : "Last 30 days"}
          icon={Brain}
        />
        <StatCard
          title="Estimated Cost"
          value={summary ? formatCurrency(summary.estimated_cost_usd) : "—"}
          description="AI spend (30d)"
          icon={TrendingUp}
        />
        <StatCard
          title="Lead Conversion"
          value={summary ? `${summary.lead_conversion_rate}%` : "—"}
          description={
            summary
              ? `${summary.converted_leads} of ${summary.total_leads} leads`
              : "Pipeline conversion"
          }
          icon={Target}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user?.name?.split(" ")[0] ?? "there"}!</CardTitle>
            <CardDescription>
              AgentFlow CRM — automate workflows, qualify leads, and track performance.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Build drag-and-drop workflows with AI agents, integrations, and CRM actions.
            </p>
            <Button variant="outline" size="sm" className="w-fit" render={<Link href="/dashboard/analytics" />}>
              View full analytics
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4" />
              Quick links
            </CardTitle>
            <CardDescription>Jump to common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard/workflows" className="text-primary hover:underline">
                  Create a workflow
                </Link>
              </li>
              <li>
                <Link href="/dashboard/crm/leads" className="text-primary hover:underline">
                  Manage leads
                </Link>
              </li>
              <li>
                <Link href="/dashboard/agents" className="text-primary hover:underline">
                  Run AI agents
                </Link>
              </li>
              <li>
                <Link href="/dashboard/integrations" className="text-primary hover:underline">
                  Connect integrations
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, token } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const data = await getAnalyticsOverview(token, 30);
      setSummary(data.summary);
    } catch {
      setSummary(null);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void loadStats();
  }, [token, loadStats]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader title="Dashboard" description="Loading your workspace…" />
          <DashboardSkeleton />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader
          title="Dashboard"
          description="Overview of your CRM workspace"
        />
        {statsLoading ? <DashboardSkeleton /> : <DashboardContent summary={summary} />}
      </SidebarInset>
    </SidebarProvider>
  );
}
