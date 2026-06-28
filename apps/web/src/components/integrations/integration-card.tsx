"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import { IntegrationMetricsPanel } from "@/components/integrations/integration-metrics";
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

function isOpenAIConfigured() {
  return true; // platform card is always "connected" in this UI
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
  const normalizedStatus = String(card.status || "").toUpperCase();
  const connected = normalizedStatus === "CONNECTED";
  const unhealthy = connected && String(card.health_status || "").toUpperCase() === "ERROR";
  const isOAuth = card.auth_type === "oauth";
  const isPlatform = card.auth_type === "platform";
  const isWebhooks = card.slug === "webhooks";
  const isN8n = card.slug === "n8n";
  const isNotion = card.slug === "notion";
  const isOpenAI = card.slug === "openai";

  const [expanded, setExpanded] = useState(true);
  const showMetrics = connected || isOpenAI;

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
              <CardDescription className="line-clamp-2 text-xs">{card.description}</CardDescription>
            </div>
          </div>
          {connected ? (
            <Badge variant={unhealthy ? "destructive" : "default"} className="shrink-0 gap-1">
              {unhealthy ? (
                <AlertCircle className="size-3" />
              ) : (
                <CheckCircle2 className="size-3" />
              )}
              {unhealthy ? "Error" : "Connected"}
            </Badge>
          ) : normalizedStatus === "ERROR" ? (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="size-3" />
              Error
            </Badge>
          ) : normalizedStatus === "EXPIRED" ? (
            <Badge variant="secondary">Expired</Badge>
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
          <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <dt>Last sync</dt>
              <dd className="text-foreground">{formatLastSync(card.last_sync_at)}</dd>
            </div>
            {(card.account_email || card.display_name) && !isN8n && !isPlatform && (
              <div>
                <dt>Account</dt>
                <dd className="truncate text-foreground">
                  {card.account_email ?? card.display_name}
                </dd>
              </div>
            )}
            {isNotion && (card.settings.workspace_name as string | undefined) && (
              <div>
                <dt>Workspace</dt>
                <dd className="truncate text-foreground">
                  {card.settings.workspace_name as string}
                </dd>
              </div>
            )}
            {isOpenAI && (card.settings.model as string | undefined) && (
              <div>
                <dt>Model</dt>
                <dd className="font-mono text-foreground">
                  {card.settings.model as string}
                </dd>
              </div>
            )}
            {isN8n && (card.settings.instance_url as string | undefined) && (
              <div className="col-span-2">
                <dt>Instance</dt>
                <dd className="truncate font-mono text-[11px] text-foreground">
                  {card.settings.instance_url as string}
                </dd>
              </div>
            )}
          </dl>
        )}

        {showMetrics && (
          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mb-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              Live metrics
            </button>
            {expanded && (
              <IntegrationMetricsPanel
                slug={card.slug}
                token={token ?? ""}
                openaiConfigured={isOpenAIConfigured()}
                initial={card.metrics ?? {}}
              />
            )}
          </div>
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