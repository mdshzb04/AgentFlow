"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Building2,
  CheckSquare,
  Handshake,
  History,
  LayoutDashboard,
  Link2,
  LogOut,
  ScrollText,
  StickyNote,
  UserPlus,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getUserInitials } from "@/lib/auth";
import { CRM_ENTITIES } from "@/types/crm";

const iconMap = {
  LayoutDashboard,
  BarChart3,
  Workflow,
  Bot,
  History,
  Link2,
  ScrollText,
  UserPlus,
  Users,
  Building2,
  Handshake,
  CheckSquare,
  StickyNote,
};

const crmNavItems = CRM_ENTITIES.map((e) => ({
  title: e.label,
  href: e.href,
  icon:
    e.key === "leads"
      ? ("UserPlus" as const)
      : e.key === "contacts"
        ? ("Users" as const)
        : e.key === "companies"
          ? ("Building2" as const)
          : e.key === "deals"
            ? ("Handshake" as const)
            : e.key === "tasks"
              ? ("CheckSquare" as const)
              : ("StickyNote" as const),
}));

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <Logo size="sm" href="" className="group-data-[collapsible=icon]:!h-7" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/dashboard"}
                  tooltip="Dashboard"
                  render={<Link href="/dashboard" />}
                >
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/dashboard/analytics"}
                  tooltip="Analytics"
                  render={<Link href="/dashboard/analytics" />}
                >
                  <BarChart3 />
                  <span>Analytics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmNavItems.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Automation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/dashboard/workflows")}
                  tooltip="AI Automations"
                  render={<Link href="/dashboard/workflows" />}
                >
                  <Workflow />
                  <span>Automations</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/dashboard/agents") && !pathname.includes("executions")}
                  tooltip="AI Agents"
                  render={<Link href="/dashboard/agents" />}
                >
                  <Bot />
                  <span>AI Agents</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.includes("/agents/executions")}
                  tooltip="AI Execution History"
                  render={<Link href="/dashboard/agents/executions" />}
                >
                  <History />
                  <span>AI History</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.includes("/workflows/executions")}
                  tooltip="Workflow Logs"
                  render={<Link href="/dashboard/workflows/executions" />}
                >
                  <ScrollText />
                  <span>Workflow Logs</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/dashboard/webhooks")}
                  tooltip="Webhooks"
                  render={<Link href="/dashboard/webhooks" />}
                >
                  <Webhook />
                  <span>Webhooks</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/dashboard/integrations")}
                  tooltip="Integrations"
                  render={<Link href="/dashboard/integrations" />}
                >
                  <Link2 />
                  <span>Integrations</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex w-full items-center gap-2 rounded-md p-2 group-data-[collapsible=icon]:justify-center">
              <Avatar className="size-8 shrink-0">
                {user?.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                )}
                <AvatarFallback>
                  {user ? getUserInitials(user) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{user?.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
