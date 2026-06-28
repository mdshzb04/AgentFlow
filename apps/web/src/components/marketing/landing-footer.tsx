"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Info, Mail, Webhook, Workflow } from "lucide-react";

import { Logo } from "@/components/brand/logo";

const FOOTER_LINKS = {
  product: [
    { label: "Features", href: "/#features" },
    { label: "Platform", href: "/#platform" },
    { label: "Webhooks", href: "/webhooks/new" },
  ],
  account: [
    { label: "Sign in", href: "/login" },
    { label: "Sign up", href: "/signup" },
    { label: "Contact", href: "/contact" },
  ],
};

const APP_INFO = {
  name: "AgentFlow CRM",
  version: "1.0.0",
  description:
    "AgentFlow is an AI-native CRM platform that unifies contact management, workflow automation, webhook integrations, and real-time analytics in a single workspace. Describe an automation in plain English and our AI architect wires up the workflow for you — no node-by-node wiring required.",
  features: [
    "Natural-language workflow builder powered by AI",
    "Visual node-and-edge automation editor",
    "Native webhooks, Gmail, and Google Sheets integrations",
    "Real-time lead qualification and CRM analytics",
    "Voice-enabled assistant for hands-free CRM actions",
  ],
  stack: "Next.js · FastAPI · PostgreSQL · GraphQL",
};

export function LandingFooter() {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <footer className="border-t border-white/10 bg-[#06060b] text-zinc-400">
      <div className="container mx-auto px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo size="md" href="/" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              AI-powered CRM with workflow automation, integrations, and analytics — built for
              modern teams.
            </p>
            <div className="mt-6 flex gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
                <Workflow className="size-3.5 text-violet-400" />
                Workflows
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
                <Webhook className="size-3.5 text-cyan-400" />
                Webhooks
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
                <Mail className="size-3.5 text-rose-400" />
                Contact
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowAbout((v) => !v)}
              aria-expanded={showAbout}
              className="group mt-6 inline-flex items-center gap-1.5 text-sm text-violet-400 transition-colors hover:text-violet-300"
            >
              <Info className="size-4" />
              <span className="underline-offset-4 group-hover:underline">
                What is AgentFlow?
              </span>
              <ChevronDown
                className={`size-4 transition-transform ${showAbout ? "rotate-180" : ""}`}
              />
            </button>

            {showAbout && (
              <div className="mt-4 max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-relaxed text-zinc-400 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-white">{APP_INFO.name}</h4>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                    v{APP_INFO.version}
                  </span>
                </div>
                <p className="mt-3 text-zinc-400">{APP_INFO.description}</p>
                <ul className="mt-4 space-y-2">
                  {APP_INFO.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-violet-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-white/10 pt-3 text-xs text-zinc-500">
                  Built on {APP_INFO.stack}
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Account
            </h3>
            <ul className="mt-4 space-y-3">
              {FOOTER_LINKS.account.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm sm:flex-row">
          <p>© {new Date().getFullYear()} AgentFlow CRM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
