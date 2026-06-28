"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bot,
  Cpu,
  FileText,
  Mail,
  MessageSquare,
  Plug,
  Sparkles,
  Table,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react";

function WorkflowVisual() {
  const gradientId = useId();
  const nodes = [
    { icon: Zap, x: "12%", y: "20%", delay: 0 },
    { icon: Bot, x: "50%", y: "8%", delay: 0.2 },
    { icon: Mail, x: "78%", y: "35%", delay: 0.4 },
    { icon: Webhook, x: "35%", y: "55%", delay: 0.6 },
  ];

  return (
    <div className="relative h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-violet-500/15">
      <svg className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <motion.path
          d="M 30 50 Q 70 20 120 35 T 200 45"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeDasharray="6 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
        />
      </svg>
      {nodes.map(({ icon: Icon, x, y, delay }) => (
        <motion.div
          key={x + y}
          className="absolute flex size-8 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/20 text-sky-400 shadow-sm"
          style={{ left: x, top: y }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="size-3.5" />
        </motion.div>
      ))}
      <motion.div
        className="absolute bottom-2 right-3 flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-400"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Workflow className="size-2.5" />
        Live
      </motion.div>
    </div>
  );
}

function AiCrmVisual() {
  return (
    <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-fuchsia-500/15">
      <motion.div
        className="absolute size-20 rounded-full border border-violet-500/30"
        animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.15, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
      <motion.div
        className="absolute size-14 rounded-full border border-violet-500/40"
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.25, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      />
      <motion.div
        className="relative flex size-12 items-center justify-center rounded-2xl border border-violet-500/50 bg-violet-500/25 text-violet-400"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <Bot className="size-6" />
      </motion.div>
      {[Sparkles, Cpu, Sparkles].map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute text-violet-400/70"
          style={{
            top: i === 0 ? "18%" : i === 1 ? "60%" : "25%",
            left: i === 0 ? "20%" : i === 1 ? "15%" : "75%",
          }}
          animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
        >
          <Icon className="size-4" />
        </motion.div>
      ))}
    </div>
  );
}

function IntegrationsVisual() {
  const providers = [
    { icon: FileText },
    { icon: Workflow },
    { icon: Mail },
    { icon: MessageSquare },
    { icon: Table },
  ];
  return (
    <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/15 via-green-500/10 to-teal-500/15">
      <motion.div
        className="absolute size-24 rounded-full border border-emerald-500/25"
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="relative z-10 flex size-11 items-center justify-center rounded-xl border border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        <Plug className="size-5" />
      </motion.div>
      {providers.map(({ icon: Icon }, i) => {
        const angle = (i / providers.length) * Math.PI * 2;
        const radius = 46;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <motion.div
            key={i}
            className="absolute flex size-7 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
            style={{ x, y }}
            animate={{ y: [y, y - 4, y], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2, delay: i * 0.25, repeat: Infinity }}
          >
            <Icon className="size-3.5" />
          </motion.div>
        );
      })}
    </div>
  );
}

function WebhooksVisual() {
  return (
    <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-yellow-500/15">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute left-3 top-1/2 size-2 -translate-y-1/2 rounded-full bg-amber-400"
          animate={{ opacity: [0, 1, 0], x: [0, 60, 110] }}
          transition={{ duration: 2.2, delay: i * 0.6, repeat: Infinity, ease: "linear" }}
        />
      ))}
      <motion.div
        className="relative z-10 flex size-11 items-center justify-center rounded-xl border border-amber-500/50 bg-amber-500/20 text-amber-400"
        animate={{
          boxShadow: [
            "0 0 0 0 rgba(245,158,11,0.3)",
            "0 0 0 10px rgba(245,158,11,0)",
            "0 0 0 0 rgba(245,158,11,0.3)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Webhook className="size-5" />
      </motion.div>
      <div className="absolute bottom-3 right-3 flex items-end gap-1">
        {[10, 18, 12, 22, 16].map((h, i) => (
          <motion.div
            key={i}
            className="w-1.5 rounded-sm bg-amber-500/60"
            animate={{ height: [h, h + 8, h] }}
            transition={{ duration: 1.6, delay: i * 0.15, repeat: Infinity }}
            style={{ height: h }}
          />
        ))}
      </div>
      <motion.div
        className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <BarChart3 className="size-2.5" />
        Live
      </motion.div>
    </div>
  );
}

export const featureVisuals = {
  workflow: WorkflowVisual,
  ai: AiCrmVisual,
  integrations: IntegrationsVisual,
  webhooks: WebhooksVisual,
} as const;
