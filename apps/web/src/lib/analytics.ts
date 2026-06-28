import { apiRequest } from "@/lib/api";
import type { AnalyticsOverview } from "@/types/analytics";

export function getAnalyticsOverview(
  token: string,
  days = 30,
): Promise<AnalyticsOverview> {
  return apiRequest<AnalyticsOverview>(`/api/v1/analytics/overview?days=${days}`, {
    token,
  });
}
