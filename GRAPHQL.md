# GraphQL in AgentFlow CRM

AgentFlow uses a **hybrid API architecture**: GraphQL powers the CRM UI while REST continues to serve integrations, webhooks, analytics, and workflow automation.

## Endpoints

| Layer | URL | Auth |
|-------|-----|------|
| GraphQL | `POST /graphql` | `Authorization: Bearer <token>` |
| GraphiQL (dev only) | `GET /graphql` | Same Bearer token in headers |
| REST (unchanged) | `/api/v1/*` | Same JWT |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js frontend                                       │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ Apollo Client   │  │ TanStack Query               │  │
│  │ CRM pages       │  │ Webhooks, Integrations, etc. │  │
│  └────────┬────────┘  └──────────────┬───────────────┘  │
└───────────┼──────────────────────────┼──────────────────┘
            │ POST /graphql              │ GET/POST /api/v1/*
            ▼                            ▼
┌─────────────────────────────────────────────────────────┐
│  FastAPI backend                                        │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ Strawberry GQL  │  │ REST routers (unchanged)     │  │
│  │ + DataLoaders   │  │ /api/v1/crm, integrations…   │  │
│  └────────┬────────┘  └──────────────┬───────────────┘  │
│           └────────────┬─────────────┘                  │
│                        ▼                                │
│              SQLAlchemy + PostgreSQL                    │
└─────────────────────────────────────────────────────────┘
```

## Backend

- **Library:** [Strawberry GraphQL](https://strawberry.rocks/) (Python, schema-from-types)
- **Mount:** `apps/api/app/graphql/` → `/graphql`
- **Auth:** Same JWT as REST (`decode_access_token`, user-scoped queries)
- **DataLoaders:** Batch nested relationship loads (company → contacts/deals/leads)
- **Features:** Pagination, sorting, filtering, structured errors (`UNAUTHENTICATED`, `NOT_FOUND`, `BAD_USER_INPUT`)

### Sample query

```graphql
query ListCompanies {
  companies(pagination: { limit: 20, offset: 0 }) {
    nodes {
      id
      name
      domain
      industry
      createdAt
      updatedAt
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
```

### Sample mutation

```graphql
mutation CreateLead($input: LeadCreateInput!) {
  createLead(input: $input) {
    id
    title
    status
    email
  }
}
```

Variables:

```json
{
  "input": {
    "title": "Enterprise SaaS opportunity",
    "email": "buyer@acme.com",
    "status": "new"
  }
}
```

### Nested labels query (replaces 5 REST calls)

```graphql
query CrmRecordLabels {
  crmRecordLabels {
    companies { id label subtitle }
    contacts  { id label subtitle }
    leads     { id label subtitle }
    deals     { id label subtitle }
    tasks     { id label subtitle }
  }
}
```

## Frontend

### Apollo setup

| File | Purpose |
|------|---------|
| `src/lib/apollo/client.ts` | ApolloClient singleton, batch link |
| `src/lib/apollo/provider.tsx` | `ApolloProvider` wrapper |
| `src/lib/apollo/authLink.ts` | Injects Bearer token from `AuthProvider` |
| `src/lib/apollo/cache.ts` | Normalized cache (`__typename` + `id`) |

Provider order in `layout.tsx`:

```
ThemeProvider → QueryProvider → ApolloAppProvider → AuthProvider
```

Both React Query and Apollo run simultaneously.

### Operations & codegen

- Schema: `src/graphql/schema.graphql`
- Operations: `src/graphql/operations/crm.graphql`
- Generated hooks: `src/graphql/generated/graphql.ts`

Regenerate after schema/operation changes:

```bash
cd apps/web && npm run codegen
```

### CRM usage

CRM list pages use `useCrmEntity()` which wraps generated hooks with cache updates on create/delete. Record label helpers in `src/lib/crm-records.ts` use a single `crmRecordLabels` query instead of five REST list calls.

### Logout

`AuthProvider.logout()` calls `resetApolloClient()` to clear the Apollo cache when the session ends.

## Development

1. Start API: `cd apps/api && uvicorn app.main:app --reload`
2. Start web: `npm run dev`
3. Open GraphiQL: http://localhost:8000/graphql
4. Add header: `{ "Authorization": "Bearer <your-jwt>" }`

## REST compatibility

All existing REST endpoints under `/api/v1/crm/*` remain fully functional. Workflows, agents, and external integrations should continue using REST until explicitly migrated.
