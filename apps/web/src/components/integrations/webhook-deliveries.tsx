import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

interface WebhookLog {
  id: string;
  endpoint_id: string;
  direction: string;
  status: string;
  status_code: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  completed_at: string | null;
}

export function WebhookDeliveries() {
  const { token } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["webhook-deliveries", token],
    queryFn: () =>
      apiRequest<WebhookLog[]>("/api/v1/webhooks/logs?limit=15", {
        token: token!,
      }),
    enabled: !!token,
    staleTime: 10_000,
  });

  const logs = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="size-4" /> Recent Webhook Deliveries
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Real HTTP deliveries with request/response logging, retries, and failures.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No webhook deliveries yet.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {logs.map((l) => (
              <div key={l.id} className="rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium uppercase">{l.direction}</span>
                  <span
                    className={
                      l.status === "success"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : l.status === "pending"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-destructive"
                    }
                  >
                    {l.status}
                    {l.status_code ? ` · ${l.status_code}` : ""}
                  </span>
                </div>
                <div className="mt-1 flex gap-3 text-muted-foreground">
                  {l.retry_count > 0 && <span>retries: {l.retry_count}</span>}
                  {l.created_at && <span>{new Date(l.created_at).toLocaleString()}</span>}
                </div>
                {l.error_message && (
                  <p className="mt-1 text-destructive">{l.error_message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
