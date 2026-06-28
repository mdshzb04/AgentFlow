"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { IntegrationBrandId } from "@/components/icons/integration-brands";

const CENTER = { x: 50, y: 50 };
const MAX_PARTICLES = 6;
const ORBIT_SVG_RADIUS = 42;

export function getSvgPoint(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER.x + Math.cos(angle) * ORBIT_SVG_RADIUS,
    y: CENTER.y + Math.sin(angle) * ORBIT_SVG_RADIUS,
  };
}

export type FlowParticle = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  duration: number;
  integrationId: IntegrationBrandId;
  inbound: boolean;
  small?: boolean;
};

function FlowParticleDot({
  particle,
  speed,
  onComplete,
}: {
  particle: FlowParticle;
  speed: number;
  onComplete: () => void;
}) {
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;

  return (
    <motion.circle
      r={particle.small ? 0.65 : 1.1}
      fill={particle.color}
      cx={particle.fromX}
      cy={particle.fromY}
      opacity={0.85}
      animate={{
        cx: [particle.fromX, particle.toX],
        cy: [particle.fromY, particle.toY],
      }}
      transition={{
        duration: particle.duration / speed,
        ease: [0.45, 0, 0.2, 1],
      }}
      onAnimationComplete={() => doneRef.current()}
    />
  );
}

interface IntegrationFlowCanvasProps {
  integrationIds: IntegrationBrandId[];
  particleColors: Record<IntegrationBrandId, string>;
  hoveredId: IntegrationBrandId | null;
  hubPulse: boolean;
  onHubPulse: () => void;
  onIntegrationReceive: (id: IntegrationBrandId) => void;
}

export function IntegrationFlowCanvas({
  integrationIds,
  particleColors,
  hoveredId,
  hubPulse,
  onHubPulse,
  onIntegrationReceive,
}: IntegrationFlowCanvasProps) {
  const reduceMotion = useReducedMotion();
  const glowId = useId();
  const [particles, setParticles] = useState<FlowParticle[]>([]);
  const particlesRef = useRef(particles);
  particlesRef.current = particles;
  const particleSeq = useRef(0);

  const removeParticle = useCallback((id: string) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const spawnOutbound = useCallback(
    (excludeId?: IntegrationBrandId) => {
      const count = 2 + Math.floor(Math.random() * 3);
      const indices = integrationIds
        .map((_, i) => i)
        .filter((i) => integrationIds[i] !== excludeId)
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

      indices.forEach((idx, i) => {
        setTimeout(() => {
          if (particlesRef.current.length >= MAX_PARTICLES) return;
          const id = integrationIds[idx];
          const to = getSvgPoint(idx, integrationIds.length);
          setParticles((prev) => {
            if (prev.length >= MAX_PARTICLES) return prev;
            return [
              ...prev,
              {
                id: `out-${particleSeq.current++}`,
                fromX: CENTER.x,
                fromY: CENTER.y,
                toX: to.x,
                toY: to.y,
                color: particleColors[id],
                duration: 0.85 + i * 0.08,
                integrationId: id,
                inbound: false,
                small: true,
              },
            ];
          });
        }, i * 100);
      });
    },
    [integrationIds, particleColors],
  );

  const handleComplete = useCallback(
    (particle: FlowParticle) => {
      removeParticle(particle.id);
      if (particle.inbound) {
        onHubPulse();
        spawnOutbound(particle.integrationId);
      } else {
        onIntegrationReceive(particle.integrationId);
      }
    },
    [onHubPulse, onIntegrationReceive, removeParticle, spawnOutbound],
  );

  useEffect(() => {
    if (reduceMotion) return;

    let timeout: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      const delay = 2000 + Math.random() * 1000;
      timeout = setTimeout(() => {
        if (cancelled) return;
        if (particlesRef.current.length >= MAX_PARTICLES) {
          schedule();
          return;
        }
        const idx = Math.floor(Math.random() * integrationIds.length);
        const id = integrationIds[idx];
        const from = getSvgPoint(idx, integrationIds.length);
        setParticles((prev) => {
          if (prev.length >= MAX_PARTICLES) return prev;
          return [
            ...prev,
            {
              id: `in-${particleSeq.current++}`,
              fromX: from.x,
              fromY: from.y,
              toX: CENTER.x,
              toY: CENTER.y,
              color: particleColors[id],
              duration: 1.15,
              integrationId: id,
              inbound: true,
            },
          ];
        });
        schedule();
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [integrationIds, particleColors, reduceMotion]);

  const lineBoost = (id: IntegrationBrandId) =>
    hoveredId === id ? 0.22 : 0.07;

  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`${glowId}-hub`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139,92,246,0.35)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </radialGradient>
      </defs>

      <motion.circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={hubPulse ? 8 : 5}
        fill={`url(#${glowId}-hub)`}
        animate={{ opacity: hubPulse ? [0.25, 0.65, 0.15] : 0.12 }}
        transition={{
          duration: hubPulse ? 0.55 : 4,
          repeat: hubPulse ? 0 : Infinity,
          ease: "easeOut",
        }}
      />

      {integrationIds.map((id, i) => {
        const pt = getSvgPoint(i, integrationIds.length);
        return (
          <motion.line
            key={id}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={pt.x}
            y2={pt.y}
            stroke="rgba(255,255,255,1)"
            strokeWidth={0.12}
            vectorEffect="non-scaling-stroke"
            animate={{ strokeOpacity: lineBoost(id) }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          />
        );
      })}

      {particles.map((p) => (
        <g key={p.id} filter={`url(#${glowId})`}>
          <FlowParticleDot
            particle={p}
            speed={
              hoveredId && (p.integrationId === hoveredId || p.inbound) ? 1.75 : 1
            }
            onComplete={() => handleComplete(p)}
          />
        </g>
      ))}
    </svg>
  );
}
