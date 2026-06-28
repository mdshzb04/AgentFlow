"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { IntegrationProviderCard } from "@/components/integrations/integration-card";
import { IntegrationCardSkeleton } from "@/components/integrations/integration-card-skeleton";
import { N8nImportDialog } from "@/components/integrations/n8n-import-dialog";
import {
  N8nConnectDialog,
  N8nSettingsModal,
} from "@/components/integrations/n8n-settings-modal";
import { NotionConnectDialog } from "@/components/integrations/notion-connect-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { ApiError } from "@/lib/api";
import {
  connectNotion,
  disconnectIntegration,
  getConnectUrl,
  listIntegrations,
  testIntegration,
  type IntegrationCard,
} from "@/lib/integrations-platform";

export default function IntegrationsPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<IntegrationsSkeleton />}>
        <IntegrationsContent />
      </Suspense>
    </DashboardShell>
  );
}

function IntegrationsSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function IntegrationsContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [n8nConnectOpen, setN8nConnectOpen] = useState(false);
  const [n8nSettingsOpen, setN8nSettingsOpen] = useState(false);
  const [n8nImportOpen, setN8nImportOpen] = useState(false);
  const [notionConnectOpen, setNotionConnectOpen] = useState(false);
  const [activeN8nId, setActiveN8nId] = useState<string | null>(null);
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const connected = searchParams.get("connected");
  const oauthError = searchParams.get("error");

  // Clear the OAuth result query params after showing the banner so it doesn't
  // persist across navigation/refresh and cause a stale visual glitch.
  useEffect(() => {
    if (!connected && !oauthError) return;
    const t = setTimeout(() => {
      router.replace("/dashboard/integrations");
    }, 6000);
    return () => clearTimeout(t);
  }, [connected, oauthError, router]);

  const { data: cards = [], isLoading, isError, error } = useQuery({
    queryKey: ["integrations", token],
    queryFn: () => listIntegrations(token!),
    enabled: !!token,
  });

  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => disconnectIntegration(token!, connectionId),
    onMutate: async (connectionId) => {
      setDisconnectingId(connectionId);
      await queryClient.cancelQueries({ queryKey: ["integrations"] });
      const prev = queryClient.getQueryData<IntegrationCard[]>(["integrations", token]);
      queryClient.setQueryData<IntegrationCard[]>(
        ["integrations", token],
        (old) =>
          old?.map((c) =>
            c.connection_id === connectionId
              ? { ...c, status: "disconnected" as const, connection_id: null }
              : c,
          ) ?? [],
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["integrations", token], ctx.prev);
      toast.error("Failed to disconnect");
    },
    onSuccess: () => toast.success("Disconnected"),
    onSettled: () => {
      setDisconnectingId(null);
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: (vars: { connectionId: string; slug: string }) =>
      testIntegration(token!, vars.connectionId),
    onSuccess: (result, vars) => {
      const label = vars.slug[0].toUpperCase() + vars.slug.slice(1);
      if (result.healthy) toast.success(`${label} connection restored`);
      else toast.error(result.message);
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onSettled: () => setConnectingSlug(null),
  });

  const connectNotionMutation = useMutation({
    mutationFn: (apiKey: string | null) => connectNotion(token!, apiKey),
    onSuccess: () => {
      toast.success("Notion connected");
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setNotionConnectOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to connect Notion");
    },
    onSettled: () => setConnectingSlug(null),
  });

  const handleOAuthReconnect = (card: IntegrationCard) => {
    if (card.connect_url) window.location.href = getConnectUrl(card.connect_url, token ?? undefined);
  };

  return (
    <>
      <DashboardHeader
        title="Integrations"
        description="Connect your tools and automate workflows across your stack"
      />

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {connected && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            Successfully connected {connected.replace(/_/g, " ")}!
          </div>
        )}
        {oauthError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {decodeURIComponent(oauthError)}
          </div>
        )}
        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Failed to load integrations"}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <IntegrationCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const slug = card.slug;
              const isThisConnecting =
                connectingSlug === slug &&
                (reconnectMutation.isPending || connectNotionMutation.isPending);
              return (
                <IntegrationProviderCard
                  key={card.slug}
                  card={card}
                  token={token ?? undefined}
                  isConnecting={isThisConnecting}
                  isDisconnecting={
                    !!card.connection_id && disconnectingId === card.connection_id
                  }
                  onConnect={
                    card.slug === "n8n"
                      ? () => setN8nConnectOpen(true)
                      : card.slug === "notion"
                        ? () => setNotionConnectOpen(true)
                        : undefined
                  }
                  onDisconnect={
                    card.connection_id
                      ? () => disconnectMutation.mutate(card.connection_id!)
                      : undefined
                  }
                  onSettings={
                    card.slug === "n8n" && card.connection_id
                      ? () => {
                          setActiveN8nId(card.connection_id);
                          setN8nSettingsOpen(true);
                        }
                      : undefined
                  }
                  onImport={
                    card.slug === "n8n" && card.connection_id
                      ? () => {
                          setActiveN8nId(card.connection_id);
                          setN8nImportOpen(true);
                        }
                      : undefined
                  }
                  onReconnect={
                    card.connection_id
                      ? () => {
                          if (card.auth_type === "oauth" && card.connect_url) {
                            handleOAuthReconnect(card);
                          } else if (card.slug === "n8n") {
                            setActiveN8nId(card.connection_id);
                            setN8nSettingsOpen(true);
                          } else if (card.slug === "notion") {
                            setNotionConnectOpen(true);
                          } else {
                            setConnectingSlug(slug);
                            reconnectMutation.mutate({
                              connectionId: card.connection_id!,
                              slug,
                            });
                          }
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {token && (
        <>
          <N8nConnectDialog
            open={n8nConnectOpen}
            onOpenChange={setN8nConnectOpen}
            token={token}
            defaultBaseUrl={
              (typeof process !== "undefined" &&
                process.env.NEXT_PUBLIC_N8N_BASE_URL) ||
              ""
            }
          />
          <NotionConnectDialog
            open={notionConnectOpen}
            onOpenChange={setNotionConnectOpen}
            isConnecting={connectNotionMutation.isPending}
            onSubmit={(apiKey) => {
              setConnectingSlug("notion");
              connectNotionMutation.mutate(apiKey || null);
            }}
          />
          {activeN8nId && (
            <N8nSettingsModal
              open={n8nSettingsOpen}
              onOpenChange={setN8nSettingsOpen}
              connectionId={activeN8nId}
              token={token}
            />
          )}
          {activeN8nId && (
            <N8nImportDialog
              open={n8nImportOpen}
              onOpenChange={setN8nImportOpen}
              accountId={activeN8nId}
              token={token}
            />
          )}
        </>
      )}
    </>
  );
}
