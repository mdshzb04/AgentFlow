"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Plug,
  Webhook,
  Workflow,
} from "lucide-react";

import { featureVisuals } from "@/components/marketing/feature-card-visuals";

const features = [
  {
    icon: Workflow,
    visualKey: "workflow" as const,
    title: "Agent Workflows",
    description:
      "Design multi-step automations that connect your CRM data to AI agents and external tools.",
    border: "from-sky-400 via-blue-500 to-violet-500",
    bg: "from-sky-500/8 via-blue-500/5 to-violet-500/8",
    iconAccent: "border-sky-500/40 bg-sky-500/15 text-sky-400",
    label: "text-sky-400",
  },
  {
    icon: Bot,
    visualKey: "ai" as const,
    title: "AI-Native CRM",
    description:
      "Qualify leads, draft emails, and summarize meetings with built-in OpenAI and Claude agents.",
    border: "from-violet-400 via-purple-500 to-fuchsia-500",
    bg: "from-violet-500/8 via-purple-500/5 to-fuchsia-500/8",
    iconAccent: "border-violet-500/40 bg-violet-500/15 text-violet-400",
    label: "text-violet-400",
  },
  {
    icon: Plug,
    visualKey: "integrations" as const,
    title: "Native Integrations",
    description:
      "Connect Notion, n8n, Gmail, and Google Sheets with validated OAuth and encrypted API keys.",
    border: "from-emerald-400 via-green-500 to-teal-500",
    bg: "from-emerald-500/8 via-green-500/5 to-teal-500/8",
    iconAccent: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
    label: "text-emerald-400",
  },
  {
    icon: Webhook,
    visualKey: "webhooks" as const,
    title: "Webhooks & Analytics",
    description:
      "Trigger workflows via inbound webhooks, track every run, and monitor pipeline health in real time.",
    border: "from-amber-400 via-orange-500 to-yellow-500",
    bg: "from-amber-500/8 via-orange-500/5 to-yellow-500/8",
    iconAccent: "border-amber-500/40 bg-amber-500/15 text-amber-400",
    label: "text-amber-400",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="relative overflow-hidden border-t bg-muted/30 py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 size-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 size-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need to automate sales
          </h2>
          <p className="mt-4 text-muted-foreground">
            Workflows, AI agents, integrations, and analytics — unified in one platform.
          </p>
        </motion.div>

        <div className="relative mx-auto max-w-5xl">
          <motion.div
            className="absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-sky-500/0 via-violet-500/40 to-sky-500/0 lg:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Visual = featureVisuals[feature.visualKey];

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: index * 0.15, duration: 0.5 }}
                  className="group relative h-full"
                >
                  <div className="relative h-full overflow-hidden rounded-2xl p-[2px]">
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-r ${feature.border} opacity-70`}
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      style={{ scale: 1.5 }}
                    />
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${feature.border} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                    />

                    <div
                      className={`relative flex h-full flex-col overflow-hidden rounded-[14px] bg-gradient-to-br ${feature.bg} bg-background/90 p-5 backdrop-blur-md`}
                    >
                      <Visual />

                      <div className="mt-4 flex flex-1 flex-col">
                        <div
                          className={`mb-3 inline-flex size-10 items-center justify-center rounded-xl border ${feature.iconAccent}`}
                        >
                          <feature.icon className="size-5" />
                        </div>

                        <h3 className="text-lg font-semibold">{feature.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {index < features.length - 1 && (
                    <motion.div
                      className={`absolute -right-3 top-1/2 z-10 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-background bg-gradient-to-br ${feature.border} p-px lg:flex`}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + index * 0.15 }}
                    >
                      <div className="flex size-full items-center justify-center rounded-full bg-background">
                        <ArrowRight className="size-3 text-muted-foreground" />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
