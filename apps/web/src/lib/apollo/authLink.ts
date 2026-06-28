import { setContext } from "@apollo/client/link/context";

import { getStoredToken } from "@/lib/auth";

/**
 * Injects `Authorization: Bearer <token>` from AuthProvider storage.
 */
export const authLink = setContext((_, { headers }) => {
  const token = getStoredToken();
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});
