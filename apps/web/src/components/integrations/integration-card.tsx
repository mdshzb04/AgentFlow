"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Settings,
  Unplug,
} from "lucide-react";

import {
  IntegrationBrandLogo,
  type IntegrationBrandId,
} from "@/components/icons/integration-brands";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { IntegrationCard } from "@/lib/integrations-platform";
import { getConnectUrl } from "@/lib/integrations-platform";
import { cn } from "@/lib/utils";
const SLUG_TO_BRAND: Record<string, IntegrationBrandId> = {
  openai: "openai",
  notion: "notion",
  gmail: "gmail",
  google_sheets: "sheets",
  n8n: "n8n",
  webhooks: "webhooks",
};

function formatLastSync(iso: string | null) {
  if (!iso) return "Never";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function IntegrationProviderCard({
  card,
  onConnect,
  onDisconnect,
  onSettings,
  onImport,
  onReconnect,
  isConnecting,
  isDisconnecting,
  token,
}: {
  card: IntegrationCard;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSettings?: () => void;
  onImport?: () => void;
  onReconnect?: () => void;
  isConnecting?: boolean;
  isDisconnecting?: boolean;
  token?: string;
}) {
  const brand = SLUG_TO_BRAND[card.slug] ?? "webhooks";
  const connected = card.status === "connected";
  const unhealthy = connected && card.health_status === "error";
  const isOAuth = card.auth_type === "oauth";
  const isPlatform = card.auth_type === "platform";
  const isWebhooks = card.slug === "webhooks";
  const isN8n = card.slug === "n8n";
  const isNotion = card.slug === "notion";

  const instanceUrl = card.settings.instance_url as string | undefined;
  const version = card.settings.version as string | undefined;
  const workflowsImported = card.settings.workflows_imported as number | undefined;
  const workspaceName = card.settings.workspace_name as string | undefined;
  const openaiModel = card.settings.model as string | undefined;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm transition-shadow hover:shadow-md",
        unhealthy && "border-destructive/40",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
              <IntegrationBrandLogo brand={brand} size={22} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{card.name}</CardTitle>
              <CardDescription className="text-xs">{card.description}</CardDescription>
            </div>
          </div>
          {connected ? (
            <Badge
              variant={unhealthy ? "destructive" : "default"}
              className="shrink-0 gap-1"
            >
              {unhealthy ? (
                <AlertCircle className="size-3" />
              ) : (
                <CheckCircle2 className="size-3" />
              )}
              {unhealthy ? "Error" : "Connected"}
            </Badge>
          ) : (
            <Badge variant="secondary">Disconnected</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        {unhealthy && card.last_error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {card.last_error}
          </div>
        )}

        {connected && (
          <dl className="grid gap-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between gap-2">
              <dt>Last sync</dt>
              <dd className="text-foreground">{formatLastSync(card.last_sync_at)}</dd>
            </div>
            {(card.account_email || card.display_name) && !isN8n && !isPlatform && (
              <div className="flex justify-between gap-2">
                <dt>Account</dt>
                <dd className="truncate text-foreground">
                  {card.account_email ?? card.display_name}
                </dd>
              </div>
            )}
            {isNotion && workspaceName && (
              <div className="flex justify-between gap-2">
                <dt>Workspace</dt>
                <dd className="truncate text-foreground">{workspaceName}</dd>
              </div>
            )}
            {isPlatform && openaiModel && (
              <div className="flex justify-between gap-2">
                <dt>Model</dt>
                <dd className="text-foreground">{openaiModel}</dd>
              </div>
            )}
            {isN8n && instanceUrl && (
              <>
                <div className="flex justify-between gap-2">
                  <dt>Instance</dt>
                  <dd className="truncate text-foreground font-mono text-[11px]">
                    {instanceUrl}
                  </dd>
                </div>
                {version && (
                  <div className="flex justify-between gap-2">
                    <dt>Version</dt>
                    <dd className="text-foreground">{version}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt>Workflows imported</dt>
                  <dd className="text-foreground">{workflowsImported ?? 0}</dd>
                </div>
              </>
            )}
          </dl>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 border-t border-border/40 bg-muted/20 px-4 py-3">
        {isWebhooks ? (
          <Button size="sm" nativeButton={false} render={<Link href="/dashboard/webhooks" />}>
            Manage Webhooks
          </Button>
        ) : isPlatform ? (
          <span className="text-xs text-muted-foreground">Configured on server</span>
        ) : connected ? (
          <>
            {unhealthy && onReconnect && (
              <Button size="sm" variant="outline" onClick={onReconnect} disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 size-3.5" />
                )}
                Reconnect
              </Button>
            )}
            {isN8n && onImport && (
              <Button size="sm" variant="secondary" onClick={onImport}>
                Import Workflows
              </Button>
            )}
            {isN8n && onSettings && (
              <Button size="sm" variant="outline" onClick={onSettings}>
                <Settings className="mr-1.5 size-3.5" />
                Settings
              </Button>
            )}
            {!isOAuth && !isPlatform && onDisconnect && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Unplug className="mr-1.5 size-3.5" />
                )}
                Disconnect
              </Button>
            )}
            {isOAuth && onDisconnect && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDisconnect}
                disabled={isDisconnecting}
              >
                <Unplug className="mr-1.5 size-3.5" />
                Disconnect
              </Button>
            )}
          </>
        ) : isOAuth && !card.connect_url ? (
          <span className="text-xs text-muted-foreground">
            OAuth not configured — add credentials in server settings
          </span>
        ) : isOAuth && card.connect_url ? (
          <Button
            size="sm"
            nativeButton={false}
            render={
              <a href={getConnectUrl(card.connect_url, token)} target="_self" rel="noopener" />
            }
          >
            Connect
          </Button>
        ) : isN8n && onConnect ? (
          <Button size="sm" onClick={onConnect} disabled={isConnecting}>
            {isConnecting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Connect
          </Button>
        ) : isNotion && onConnect ? (
          <Button size="sm" onClick={onConnect} disabled={isConnecting}>
            {isConnecting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Connect Notion
          </Button>
        ) : onConnect ? (
          <Button size="sm" onClick={onConnect}>
            Connect
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
