"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Mail,
  UserPlus,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface PipelineStep {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  glow: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "lead",
    label: "Lead Form",
    icon: UserPlus,
    accent: "text-sky-300",
    glow: "rgba(56, 189, 248, 0.45)",
  },
  {
    id: "ai",
    label: "AI Qualification",
    icon: Bot,
    accent: "text-violet-300",
    glow: "rgba(167, 139, 250, 0.45)",
  },
  {
    id: "crm",
    label: "CRM",
    icon: Users,
    accent: "text-indigo-300",
    glow: "rgba(129, 140, 248, 0.45)",
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    accent: "text-rose-300",
    glow: "rgba(251, 113, 133, 0.45)",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    accent: "text-emerald-300",
    glow: "rgba(52, 211, 153, 0.45)",
  },
];

const TRAVEL_SECONDS = 7;
const PAUSE_SECONDS = 1.5;
const LINGER_SECONDS = 0.2;
const NODE_FLASH_MS = 200;
const NODE_SIZE = 54;
const ICON_SIZE = 24;
const EASE = [0.45, 0, 0.2, 1] as const;

function nodePosition(index: number, total: number) {
  if (total <= 1) return 0;
  return index / (total - 1);
}

function buildPulseKeyframes(nodeCount: number) {
  const segments = Math.max(nodeCount - 1, 1);
  const moveSeconds =
    (TRAVEL_SECONDS - nodeCount * LINGER_SECONDS) / segments;

  const values: number[] = [];
  const times: number[] = [];
  let elapsed = 0;

  for (let i = 0; i < nodeCount; i++) {
    const pos = nodePosition(i, nodeCount);

    values.push(pos);
    times.push(elapsed / TRAVEL_SECONDS);

    elapsed += LINGER_SECONDS;
    values.push(pos);
    times.push(elapsed / TRAVEL_SECONDS);

    if (i < nodeCount - 1) {
      elapsed += moveSeconds;
      values.push(nodePosition(i + 1, nodeCount));
      times.push(elapsed / TRAVEL_SECONDS);
    }
  }

  return { values, times };
}

function WorkflowNode({
  step,
  index,
  pulsing,
}: {
  step: PipelineStep;
  index: number;
  pulsing: boolean;
}) {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="relative z-10 flex w-[118px] shrink-0 flex-col items-center sm:w-[128px]"
    >
      <motion.div
        animate={{
          scale: pulsing ? 1.05 : 1,
          boxShadow: pulsing
            ? `0 0 0 1px rgba(255,255,255,0.18), 0 0 14px ${step.glow}`
            : "0 0 0 1px rgba(255,255,255,0.06)",
          backgroundColor: pulsing
            ? "rgba(255,255,255,0.1)"
            : "rgba(255,255,255,0.035)",
        }}
        transition={{
          scale: { duration: 0.24, ease: EASE },
          boxShadow: { duration: 0.26, ease: EASE },
          backgroundColor: { duration: 0.26, ease: EASE },
        }}
        className="relative flex items-center justify-center rounded-full border border-white/[0.08] backdrop-blur-sm"
        style={{ width: NODE_SIZE, height: NODE_SIZE }}
      >
        <Icon
          className={cn(
            step.accent,
            pulsing && "brightness-125",
            pulsing && "drop-shadow-[0_0_5px_currentColor]",
          )}
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
          strokeWidth={1.65}
        />
      </motion.div>

      <motion.p
        animate={{ color: pulsing ? "rgb(228 228 231)" : "rgb(113 113 122)" }}
        transition={{ duration: 0.26, ease: EASE }}
        className="mt-3.5 text-center text-xs font-medium tracking-tight sm:text-[13px]"
      >
        {step.label}
      </motion.p>
    </motion.div>
  );
}

function EnergyPulse({ progress }: { progress: MotionValue<number> }) {
  const pulseLeft = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    <motion.div
      className="absolute top-1/2 -translate-y-1/2"
      style={{ left: pulseLeft, x: "-50%" }}
    >
      {/* Fading energy trail */}
      <div
        className="absolute top-1/2 right-full h-[2px] w-[72px] -translate-y-1/2"
        style={{
          background:
            "linear-gradient(to left, transparent 0%, rgba(34,211,238,0.3) 28%, rgba(167,139,250,0.24) 58%, rgba(244,114,182,0.16) 82%, transparent 100%)",
        }}
      />
      <div
        className="absolute top-1/2 right-full h-px w-10 -translate-y-1/2 opacity-50"
        style={{
          background:
            "linear-gradient(to left, transparent, rgba(255,255,255,0.4))",
        }}
      />

      <div className="relative flex size-8 items-center justify-center">
        {/* Cyan → Violet → Pink glow (18–24px blur) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(34,211,238,0.65), rgba(167,139,250,0.6), rgba(244,114,182,0.55))",
            filter: "blur(20px)",
          }}
        />
        {/* 6px bright white core */}
        <div
          className="relative rounded-full bg-white"
          style={{
            width: 6,
            height: 6,
            boxShadow:
              "0 0 6px rgba(255,255,255,1), 0 0 14px rgba(167,139,250,0.45)",
          }}
        />
      </div>
    </motion.div>
  );
}

function PipelineTrack({
  progress,
  reducedMotion,
  gradientId,
}: {
  progress: MotionValue<number>;
  reducedMotion: boolean | null;
  gradientId: string;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-[6%] top-1/2 z-0 -translate-y-1/2 sm:inset-x-[5%]"
      aria-hidden
    >
      <svg
        className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2 overflow-visible"
        viewBox="0 0 1000 4"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.42" />
            <stop offset="35%" stopColor="#818cf8" stopOpacity="0.52" />
            <stop offset="65%" stopColor="#a78bfa" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.42" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1="2"
          x2="1000"
          y2="2"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.68"
        />
      </svg>

      {!reducedMotion && <EnergyPulse progress={progress} />}
    </div>
  );
}

export function AutomationPipeline() {
  const reducedMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const lastProgressRef = useRef(0);
  const flashTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const [pulsingNodes, setPulsingNodes] = useState<Record<number, boolean>>({});

  const rawId = useId().replace(/:/g, "");
  const gradientId = `pipeline-grad-${rawId}`;
  const total = PIPELINE_STEPS.length;

  const triggerNodeFlash = useCallback((index: number) => {
    setPulsingNodes((prev) => ({ ...prev, [index]: true }));

    const existing = flashTimersRef.current.get(index);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setPulsingNodes((prev) => ({ ...prev, [index]: false }));
      flashTimersRef.current.delete(index);
    }, NODE_FLASH_MS);

    flashTimersRef.current.set(index, timer);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const { values, times } = buildPulseKeyframes(total);

    progress.set(0);
    lastProgressRef.current = -0.001;
    triggerNodeFlash(0);

    const controls = animate(progress, values, {
      times,
      duration: TRAVEL_SECONDS,
      ease: "linear",
      repeat: Infinity,
      repeatDelay: PAUSE_SECONDS,
      repeatType: "loop",
    });

    return () => {
      controls.stop();
      const timers = flashTimersRef.current;
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [progress, reducedMotion, total, triggerNodeFlash]);

  useMotionValueEvent(progress, "change", (value) => {
    const prev = lastProgressRef.current;

    if (value < prev) {
      setPulsingNodes({});
      flashTimersRef.current.forEach(clearTimeout);
      flashTimersRef.current.clear();
      lastProgressRef.current = -0.001;
      if (value <= 0.001) triggerNodeFlash(0);
      return;
    }

    for (let i = 0; i < total; i++) {
      const pos = nodePosition(i, total);
      if (prev < pos && value >= pos) {
        triggerNodeFlash(i);
      }
    }

    lastProgressRef.current = value;
  });

  return (
    <div className="relative mx-auto w-full max-w-5xl py-4">
      <div className="overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative mx-auto min-w-[860px] px-3 sm:min-w-0 sm:px-0">
          <div className="relative flex min-h-[148px] items-center justify-between">
            <PipelineTrack
              progress={progress}
              reducedMotion={reducedMotion}
              gradientId={gradientId}
            />

            {PIPELINE_STEPS.map((step, index) => (
              <WorkflowNode
                key={step.id}
                step={step}
                index={index}
                pulsing={Boolean(pulsingNodes[index])}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
