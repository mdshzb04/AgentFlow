"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import {
  IntegrationBrandLogo,
  type IntegrationBrandId,
} from "@/components/icons/integration-brands";
import { IntegrationFlowCanvas } from "@/components/marketing/integration-flow-canvas";

const INTEGRATIONS = [
  { id: "openai" as const, name: "OpenAI", particle: "#10b981" },
  { id: "gmail" as const, name: "Gmail", particle: "#ea4335" },
  { id: "sheets" as const, name: "Sheets", particle: "#34a853" },
  { id: "github" as const, name: "GitHub", particle: "#e4e4e7" },
  { id: "n8n" as const, name: "n8n", particle: "#ea4b71" },
  { id: "notion" as const, name: "Notion", particle: "#fafafa" },
  { id: "webhooks" as const, name: "Webhooks", particle: "#22d3ee" },
  { id: "postgresql" as const, name: "PostgreSQL", particle: "#4169e1" },
] as const;

type Integration = (typeof INTEGRATIONS)[number];

const ORBIT_RADIUS = 172;
const ORBIT_DURATION = 100;

const PARTICLE_COLORS = Object.fromEntries(
  INTEGRATIONS.map((i) => [i.id, i.particle]),
) as Record<IntegrationBrandId, string>;

const orbitSpin = {
  rotate: 360,
  transition: { duration: ORBIT_DURATION, repeat: Infinity, ease: "linear" as const },
};

function IntegrationIcon({
  item,
  isHovered,
  isReceiving,
  onHover,
}: {
  item: Integration;
  isHovered: boolean;
  isReceiving: boolean;
  onHover: (hover: boolean) => void;
}) {
  const lit = isHovered || isReceiving;

  return (
    <motion.div
      className="pointer-events-auto flex items-center justify-center"
      aria-label={item.name}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      animate={{
        scale: lit ? 1.14 : 1,
        filter: lit
          ? `drop-shadow(0 0 14px ${item.particle}99)`
          : "drop-shadow(0 0 2px rgba(0,0,0,0.2))",
      }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      style={{ willChange: "transform, filter" }}
    >
      <IntegrationBrandLogo brand={item.id} size={36} />
    </motion.div>
  );
}

export function PipelineIntegrations() {
  const [hoveredId, setHoveredId] = useState<IntegrationBrandId | null>(null);
  const [hubPulse, setHubPulse] = useState(false);
  const [receivingIds, setReceivingIds] = useState<Set<IntegrationBrandId>>(new Set());
  const reduceMotion = useReducedMotion();

  const integrationIds = INTEGRATIONS.map((i) => i.id);
  const step = 360 / INTEGRATIONS.length;

  const triggerHubPulse = useCallback(() => {
    setHubPulse(true);
    setTimeout(() => setHubPulse(false), 520);
  }, []);

  const triggerReceive = useCallback((id: IntegrationBrandId) => {
    setReceivingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setReceivingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 650);
  }, []);

  const setHover = useCallback((id: IntegrationBrandId | null) => {
    setHoveredId(id);
  }, []);

  return (
    <section className="mt-20">
      <p className="mb-10 text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        Connects with your stack
      </p>

      {/* Desktop orbit */}
      <div className="relative mx-auto hidden h-[420px] max-w-3xl md:block">
        {/* Rotating orbit — icons + connection lines move together */}
        <motion.div
          className="absolute inset-0"
          animate={reduceMotion ? undefined : orbitSpin}
          style={{ transformOrigin: "50% 50%" }}
        >
          {!reduceMotion && (
            <IntegrationFlowCanvas
              integrationIds={integrationIds}
              particleColors={PARTICLE_COLORS}
              hoveredId={hoveredId}
              hubPulse={hubPulse}
              onHubPulse={triggerHubPulse}
              onIntegrationReceive={triggerReceive}
            />
          )}

          {INTEGRATIONS.map((item, i) => {
            const slot = i * step;
            return (
              <div
                key={item.id}
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `translate(-50%, -50%) rotate(${slot}deg) translateY(-${ORBIT_RADIUS}px) rotate(${-slot}deg)`,
                }}
              >
                <IntegrationIcon
                  item={item}
                  isHovered={hoveredId === item.id}
                  isReceiving={receivingIds.has(item.id)}
                  onHover={(h) => setHover(h ? item.id : null)}
                />
              </div>
            );
          })}
        </motion.div>

        {/* Fixed center hub */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            animate={{
              scale: hubPulse ? [1, 1.1, 1] : 1,
              boxShadow: hubPulse
                ? [
                    "0 0 0px rgba(139,92,246,0)",
                    "0 0 36px rgba(139,92,246,0.45)",
                    "0 0 12px rgba(139,92,246,0.15)",
                  ]
                : "0 0 16px rgba(139,92,246,0.08)",
            }}
            transition={
              hubPulse
                ? { duration: 0.55, ease: [0.45, 0, 0.2, 1] }
                : { duration: 0.3 }
            }
            className="flex size-[72px] items-center justify-center rounded-2xl border border-white/10 bg-[#06060b]/80 backdrop-blur-md"
            style={{ willChange: "transform, box-shadow" }}
          >
            <Image
              src="/logo-icon.png"
              alt=""
              width={40}
              height={40}
              className="size-10 object-contain"
              aria-hidden
            />
          </motion.div>
        </div>
      </div>

      {/* Mobile — bare icons, no boxes */}
      <div className="grid grid-cols-5 gap-6 md:hidden">
        {INTEGRATIONS.map((item) => (
          <div key={item.id} className="flex items-center justify-center" aria-label={item.name}>
            <IntegrationBrandLogo brand={item.id} size={28} />
          </div>
        ))}
      </div>
    </section>
  );
}
