"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutGrid,
  Mail,
  Menu,
  Moon,
  Sun,
  Webhook,
  Workflow,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const NavLink = ({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) => (
  <Link
    href={href}
    className="group flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
  >
    <Icon className="size-4 opacity-70 group-hover:opacity-100" />
    <span>{label}</span>
  </Link>
);

function MobileThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="size-9" />;

  const isDark = theme === "dark" || resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex size-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

const NAV_ITEMS = {
  left: [
    { label: "Features", href: "/#features", icon: LayoutGrid },
    { label: "Platform", href: "/#platform", icon: Workflow },
    { label: "Contact", href: "/contact", icon: Mail },
  ],
  right: [{ label: "Webhooks", href: "/webhooks/new", icon: Webhook }],
};

export function NotchNavbar({
  className,
  logo,
  ...props
}: React.HTMLAttributes<HTMLElement> & { logo?: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const surface = "bg-background";

  return (
    <>
      <header
        className={cn("fixed inset-x-0 top-0 z-50 flex h-16 px-0", className)}
        {...props}
      >
        <div className={cn("relative z-20 h-10 min-w-0 flex-1", surface)}>
          <svg className="absolute inset-0 size-full" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
            <line x1="0" y1="39.5" x2="100" y2="39.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            <line x1="0" y1="36.5" x2="100" y2="36.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
          </svg>
        </div>

        <div className="relative z-10 -ml-px flex h-16 shrink-0">
          <div className="relative h-full w-[50px] shrink-0">
            <div
              className={cn("absolute inset-0", surface)}
              style={{ clipPath: "path('M0 0 H50 V64 C25 64 25 40 0 40 Z')" }}
            />
            <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 50 64" aria-hidden>
              <path d="M0 39.5 C25 39.5 25 63.5 50 63.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
              <path d="M0 36.5 C25 36.5 25 60.5 50 60.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            </svg>
          </div>

          <div className="relative -ml-px h-full min-w-[280px] flex-1 sm:min-w-[420px] md:min-w-[560px] lg:min-w-[720px]">
            <div className={cn("absolute inset-0", surface)}>
              <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 64" preserveAspectRatio="none" aria-hidden>
                <line x1="0" y1="63.5" x2="100" y2="63.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
                <line x1="0" y1="60.5" x2="100" y2="60.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
              </svg>
            </div>

            <div className="relative flex h-full w-full items-end justify-between px-4 pb-2 md:px-8">
              <nav className="mb-1 hidden shrink-0 gap-6 md:flex lg:gap-8">
                {NAV_ITEMS.left.map((item) => (
                  <NavLink key={item.label} {...item} />
                ))}
              </nav>

              <button
                type="button"
                className="mb-1 p-1 text-foreground/70 transition-colors hover:text-foreground md:hidden"
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>

              <div className="mx-2 mt-1 flex shrink-0 justify-center md:mx-4">
                {logo ?? <Logo size="sm" href="/" priority />}
              </div>

              <nav className="hidden shrink-0 items-center gap-5 md:flex lg:gap-6">
                {NAV_ITEMS.right.map((item) => (
                  <NavLink key={item.label} {...item} />
                ))}
                <div className="flex shrink-0 items-center gap-3 lg:gap-4">
                  <ThemeToggle />
                  <Link
                    href="/login"
                    className="whitespace-nowrap text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="whitespace-nowrap rounded-2xl bg-gradient-to-r from-sky-500 to-violet-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-violet-500/20 transition-opacity hover:opacity-90"
                  >
                    Sign up
                  </Link>
                </div>
              </nav>

              <div className="mb-1 flex items-center gap-2 md:hidden">
                <MobileThemeToggle />
              </div>
            </div>
          </div>

          <div className="relative -ml-px h-full w-[50px] shrink-0">
            <div
              className={cn("absolute inset-0", surface)}
              style={{ clipPath: "path('M0 0 H50 V40 C25 40 25 64 0 64 Z')" }}
            />
            <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 50 64" aria-hidden>
              <path d="M0 63.5 C25 63.5 25 39.5 50 39.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
              <path d="M0 60.5 C25 60.5 25 36.5 50 36.5" fill="none" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            </svg>
          </div>
        </div>

        <div className={cn("relative z-20 -ml-px h-10 min-w-0 flex-1", surface)}>
          <svg className="absolute inset-0 size-full" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
            <line x1="0" y1="39.5" x2="100" y2="39.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
            <line x1="0" y1="36.5" x2="100" y2="36.5" stroke="currentColor" strokeOpacity={0.05} strokeWidth={0.5} className="text-foreground" />
          </svg>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 border-b border-foreground/5 bg-background p-4 shadow-lg md:hidden"
          >
            <nav className="flex flex-col gap-2">
              {[...NAV_ITEMS.left, ...NAV_ITEMS.right].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-foreground/5"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="size-5 opacity-70" />
                  <span className="font-medium text-foreground/90">{item.label}</span>
                </Link>
              ))}
              <div className="my-2 h-px bg-foreground/10" />
              <Link
                href="/login"
                className="flex items-center gap-3 rounded-lg p-3 font-medium text-foreground/90 transition-colors hover:bg-foreground/5"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-violet-600 p-3 font-medium text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign up
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
