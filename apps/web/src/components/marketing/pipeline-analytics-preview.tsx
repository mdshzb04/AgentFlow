"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Clock,
  LayoutDashboard,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { AnimatedCounter } from "@/components/marketing/animated-counter";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "workflows", label: "Workflows", icon: Zap },
  { id: "leads", label: "Leads", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

const RUNS_DATA = [
  { day: "Mon", value: 820 },
  { day: "Tue", value: 1100 },
  { day: "Wed", value: 980 },
  { day: "Thu", value: 1450 },
  { day: "Fri", value: 1320 },
  { day: "Sat", value: 890 },
  { day: "Sun", value: 1240 },
];

const LEADS_DATA = [
  { day: "Mon", value: 42 },
  { day: "Tue", value: 58 },
  { day: "Wed", value: 51 },
  { day: "Thu", value: 73 },
  { day: "Fri", value: 68 },
  { day: "Sat", value: 39 },
  { day: "Sun", value: 61 },
];

const METRICS = [
  { label: "Workflow Runs", value: 12431, icon: Zap, accent: "text-sky-400", bg: "bg-sky-500/10" },
  {
    label: "Success Rate",
    value: 99.4,
    suffix: "%",
    decimals: 1,
    icon: TrendingUp,
    accent: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    label: "AI Requests",
    value: 58200,
    icon: Activity,
    accent: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    label: "Leads Automated",
    value: 4510,
    icon: Target,
    accent: "text-rose-400",
    bg: "bg-rose-500/10",
  },
];

const PERIODS = ["7d", "30d", "90d"] as const;

type ChartPoint = { day: string; value: number };

function MiniBarChart({ data, color }: { data: ChartPoint[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const width = 320;
  const height = 140;
  const padding = { top: 8, right: 8, bottom: 20, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const step = innerW / data.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      role="img"
      aria-label="Bar chart"
    >
      {data.map((point, index) => {
        const barH = (point.value / max) * innerH;
        const x = padding.left + index * step + step * 0.2;
        const y = padding.top + innerH - barH;
        const barW = step * 0.6;
        return (
          <g key={point.day}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={3} />
            <text
              x={x + barW / 2}
              y={height - 4}
              textAnchor="middle"
              fill="#71717a"
              fontSize="10"
            >
              {point.day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MiniAreaChart({ data, color }: { data: ChartPoint[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const width = 320;
  const height = 140;
  const padding = { top: 8, right: 8, bottom: 20, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const step = innerW / Math.max(data.length - 1, 1);

  const points = data.map((point, index) => {
    const x = padding.left + index * step;
    const y = padding.top + innerH - (point.value / max) * innerH;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points.at(-1)?.x ?? 0} ${padding.top + innerH} L ${points[0]?.x ?? 0} ${padding.top + innerH} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      role="img"
      aria-label="Area chart"
    >
      <path d={areaPath} fill={color} fillOpacity={0.22} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} />
      {data.map((point, index) => (
        <text
          key={point.day}
          x={padding.left + index * step}
          y={height - 4}
          textAnchor="middle"
          fill="#71717a"
          fontSize="10"
        >
          {point.day}
        </text>
      ))}
    </svg>
  );
}

function ChartPanel({ tab }: { tab: TabId }) {
  const isBar = tab === "leads";
  const data = tab === "leads" ? LEADS_DATA : RUNS_DATA;
  const stroke = tab === "workflows" ? "#38bdf8" : tab === "leads" ? "#f472b6" : "#a78bfa";

  return (
    <div className="h-[180px] w-full">
      {isBar ? (
        <MiniBarChart data={data} color={stroke} />
      ) : (
        <MiniAreaChart data={data} color={stroke} />
      )}
    </div>
  );
}

export function PipelineAnalyticsPreview() {
  const [tab, setTab] = useState<TabId>("overview");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("7d");

  const chartTitles: Record<TabId, string> = {
    overview: "Activity — last 7 days",
    workflows: "Workflow executions",
    leads: "Leads captured",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: 0.15 }}
      className="mt-16 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] shadow-2xl shadow-violet-500/5"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-red-500/80" />
          <span className="size-2.5 rounded-full bg-amber-500/80" />
          <span className="size-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="rounded-md bg-white/5 px-3 py-1 text-xs text-zinc-500">
            app.agentflow.io/analytics
          </span>
        </div>
        <BarChart3 className="size-4 text-zinc-600" />
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <nav className="flex gap-1 border-b border-white/10 p-2 md:w-44 md:flex-col md:border-b-0 md:border-r md:p-3">
          {TABS.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors md:flex-none md:justify-start md:text-sm ${
                  isActive
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Main panel */}
        <div className="flex-1 p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    period === p
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="size-3.5" />
              <span>1.2s avg response</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className={`flex size-7 items-center justify-center rounded-md ${metric.bg}`}>
                    <metric.icon className={`size-3.5 ${metric.accent}`} />
                  </div>
                </div>
                <p className="text-xl font-bold tabular-nums text-white">
                  <AnimatedCounter
                    value={metric.value}
                    decimals={metric.decimals}
                    suffix={metric.suffix}
                  />
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{metric.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/5 bg-black/30 p-4">
            <p className="mb-3 text-xs font-medium text-zinc-400">{chartTitles[tab]}</p>
            <ChartPanel tab={tab} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
