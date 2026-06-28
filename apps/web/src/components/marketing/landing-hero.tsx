"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { GitHubIcon } from "@/components/icons/github";

import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute -left-32 top-10 size-72 rounded-full bg-sky-500/20 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-24 top-32 size-96 rounded-full bg-violet-500/20 blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,var(--background)_70%)]" />
      </div>

      <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            CRM built for{" "}
            <span className="bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500 bg-clip-text text-transparent">
              agent workflows
            </span>
          </motion.h1>

          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.5 }}
            className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            Connect your stack, design automations with AI, and run everything from one
            intelligent workspace — secure, fast, and production-ready.
          </motion.p>

          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.5 }}
            className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row"
          >
            <Button
              size="lg"
              className="h-12 w-full min-w-[200px] bg-gradient-to-r from-sky-500 to-violet-600 px-8 text-base text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02] hover:shadow-violet-500/50 sm:w-auto"
              asChild
            >
              <Link href="/signup">
                Get started free
                <ArrowRight className="ml-2 size-4 transition-transform group-hover/button:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full min-w-[200px] border-border/80 bg-background/60 px-8 text-base backdrop-blur-sm transition-all hover:scale-[1.02] sm:w-auto"
              asChild
            >
              <Link href="/login">
                <GitHubIcon className="mr-2 size-4" />
                Sign in with GitHub
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
