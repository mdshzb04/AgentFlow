"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Workflow, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

const HIGHLIGHTS = [
  { icon: Zap, label: "Setup in minutes" },
  { icon: Workflow, label: "Unlimited workflows" },
  { icon: Sparkles, label: "AI-native CRM" },
];

export function LandingCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-[#08080d] py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
        <div className="absolute -left-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute -right-32 top-1/3 h-56 w-56 rounded-full bg-sky-600/10 blur-[90px]" />
      </div>

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight text-white md:text-4xl"
          >
            Ready to automate your CRM?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-zinc-400"
          >
            Join AgentFlow and launch your first workflow in minutes — no credit card required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6"
          >
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-sm text-zinc-500"
              >
                <item.icon className="size-4 text-violet-400" />
                <span>{item.label}</span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              className="h-12 bg-gradient-to-r from-violet-600 to-sky-600 px-8 text-base text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110"
              asChild
            >
              <Link href="/signup">
                Get started free
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-white/15 bg-white/5 px-8 text-base text-white backdrop-blur-sm transition-all hover:bg-white/10"
              asChild
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
