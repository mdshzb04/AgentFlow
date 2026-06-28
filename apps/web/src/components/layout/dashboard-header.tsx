"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  return (
    <header className="flex h-auto min-h-16 shrink-0 flex-wrap items-center gap-2 border-b px-3 py-3 sm:px-4">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">{title}</h1>
        {description && (
          <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">{description}</p>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
