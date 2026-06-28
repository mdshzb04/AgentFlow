"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { AutomationPipeline } from "@/components/marketing/automation-pipeline";
import { PipelineAnalyticsPreview } from "@/components/marketing/pipeline-analytics-preview";
import { PipelineIntegrations } from "@/components/marketing/pipeline-integrations";
import { Button } from "@/components/ui/button";

export function LandingPlatform() {
  return (
    <section
      id="platform"
      className="relative overflow-hidden bg-[#06060b] py-28 text-white"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[500px] rounded-full bg-sky-600/10 blur-[100px]" />
        <div className="absolute right-0 top-1/3 h-[300px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="container relative mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500"
          >
            Automation Pipeline
          </motion.span>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl md:leading-tight">
            Automate your entire business{" "}
            <span className="text-zinc-400">from one workflow</span>
          </h2>
          <p className="mt-4 text-sm text-zinc-500 md:text-base">
            Connect your apps, AI agents, and business tools into intelligent workflows
            that run automatically.
          </p>
        </motion.div>

        <AutomationPipeline />

        <PipelineIntegrations />
        <PipelineAnalyticsPreview />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-14 flex justify-center"
        >
          <Button
            size="lg"
            className="h-12 border border-white/10 bg-white/10 px-8 text-base text-white backdrop-blur-md transition-all hover:bg-white/15"
            asChild
          >
            <Link href="/signup">
              Build your first workflow
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
