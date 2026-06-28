"use client";

import {
  ApolloClient,
  HttpLink,
  from,
} from "@apollo/client";

import { API_URL } from "@/lib/constants";

import { authLink } from "./authLink";
import { apolloCache } from "./cache";

const graphqlUri = `${API_URL}/graphql`;

const httpLink = new HttpLink({ uri: graphqlUri });

export function createApolloClient() {
  return new ApolloClient({
    link: from([authLink, httpLink]),
    cache: apolloCache,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
        nextFetchPolicy: "cache-first",
      },
      query: {
        fetchPolicy: "cache-first",
      },
      mutate: {
        errorPolicy: "all",
      },
    },
  });
}

/** Singleton browser client. */
let client: ApolloClient<unknown> | null = null;

export function getApolloClient(): ApolloClient<unknown> {
  if (!client) {
    client = createApolloClient();
  }
  return client;
}

export function resetApolloClient(): void {
  apolloCache.reset();
  client = null;
}
