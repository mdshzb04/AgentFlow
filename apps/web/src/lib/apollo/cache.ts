import { InMemoryCache, type InMemoryCacheConfig } from "@apollo/client";

/**
 * Apollo cache with normalization keyed by __typename + id.
 * List queries use relay-style field policies where helpful.
 */
export function createApolloCache(): InMemoryCache {
  const config: InMemoryCacheConfig = {
    typePolicies: {
      Query: {
        fields: {
          companies: { merge: false },
          contacts: { merge: false },
          leads: { merge: false },
          deals: { merge: false },
          tasks: { merge: false },
          notes: { merge: false },
          crmRecordLabels: { merge: false },
        },
      },
      Company: { keyFields: ["id"] },
      Contact: { keyFields: ["id"] },
      Lead: { keyFields: ["id"] },
      Deal: { keyFields: ["id"] },
      Task: { keyFields: ["id"] },
      Note: { keyFields: ["id"] },
      RecordLabel: { keyFields: ["id"] },
    },
  };

  return new InMemoryCache(config);
}

/** Singleton cache instance — cleared on logout. */
export const apolloCache = createApolloCache();
