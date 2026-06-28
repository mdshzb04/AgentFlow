"use client";

import { ApolloProvider } from "@apollo/client";

import { getApolloClient } from "./client";

export function ApolloAppProvider({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={getApolloClient()}>{children}</ApolloProvider>;
}
