"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardPageSkeleton } from "@/components/layout/page-skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-h-svh">
          <div className="flex h-16 items-center gap-2 border-b px-4">
            <div className="size-8 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
          <DashboardPageSkeleton />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh w-full min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  );
}
