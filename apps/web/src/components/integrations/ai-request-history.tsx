import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, Coins, Cpu } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

interface AiRequestLog {
  id: string;
  provider: string;
  model: string;
  status: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  cost_usd: number;
  request_preview: string | null;
  response_preview: string | null;
  error_message: string | null;
  created_at: string | null;
}

export function AiRequestHistory() {
  const { token } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-request-history", token],
    queryFn: () =>
      apiRequest<{ requests: AiRequestLog[] }>("/api/v1/ai/request-history", {
        token: token!,
      }),
    enabled: !!token,
    staleTime: 15_000,
  });

  const requests = data?.requests ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4" /> Live AI Request History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Real OpenAI calls — tokens, latency, model, and cost per request.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI requests recorded yet.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border bg-muted/30 p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Cpu className="size-3.5 text-muted-foreground" />
                    {r.model}
                  </div>
                  <span
                    className={
                      r.status === "success"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }
                  >
                    {r.status}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Coins className="size-3" />
                    {r.prompt_tokens}→{r.completion_tokens} tok
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {r.latency_ms}ms
                  </span>
                  <span>${r.cost_usd.toFixed(6)}</span>
                  {r.created_at && (
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  )}
                </div>
                {r.error_message && (
                  <p className="mt-1 text-destructive">{r.error_message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
