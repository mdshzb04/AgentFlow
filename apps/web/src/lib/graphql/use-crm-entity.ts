"use client";

import type { ApolloCache } from "@apollo/client";

import {
  ListCompaniesDocument,
  ListContactsDocument,
  ListDealsDocument,
  ListLeadsDocument,
  ListTasksDocument,
  useCreateCompanyMutation,
  useCreateContactMutation,
  useCreateDealMutation,
  useCreateLeadMutation,
  useCreateTaskMutation,
  useDeleteCompanyMutation,
  useDeleteContactMutation,
  useDeleteDealMutation,
  useDeleteLeadMutation,
  useDeleteTaskMutation,
  useListCompaniesQuery,
  useListContactsQuery,
  useListDealsQuery,
  useListLeadsQuery,
  useListTasksQuery,
  type ListCompaniesQuery,
  type ListContactsQuery,
  type ListDealsQuery,
  type ListLeadsQuery,
  type ListTasksQuery,
} from "@/graphql/generated/graphql";
import {
  mapCompany,
  mapContact,
  mapDeal,
  mapLead,
  mapTask,
} from "@/lib/graphql/crm-mappers";
import { toGraphqlInput } from "@/lib/graphql/field-mapper";
import type { Company, Contact, Deal, Lead, Task } from "@/types/crm";

export type CrmListEntity = "companies" | "contacts" | "leads" | "deals" | "tasks";

const LIST_PAGINATION = { limit: 100, offset: 0 };

type CrmEntityItem = Company | Contact | Lead | Deal | Task;

type ListQueryData =
  | ListCompaniesQuery
  | ListContactsQuery
  | ListLeadsQuery
  | ListDealsQuery
  | ListTasksQuery;

function prependNode<T extends ListQueryData>(
  existing: T | null,
  connectionKey: keyof T,
  node: unknown,
): T | null {
  if (!existing) return existing;
  const connection = existing[connectionKey] as {
    nodes: unknown[];
    pageInfo: { totalCount: number; hasNextPage: boolean };
  };
  return {
    ...existing,
    [connectionKey]: {
      ...connection,
      nodes: [node, ...connection.nodes],
      pageInfo: {
        ...connection.pageInfo,
        totalCount: connection.pageInfo.totalCount + 1,
      },
    },
  } as T;
}

function removeNode<T extends ListQueryData>(
  existing: T | null,
  connectionKey: keyof T,
  id: string,
): T | null {
  if (!existing) return existing;
  const connection = existing[connectionKey] as {
    nodes: { id: string }[];
    pageInfo: { totalCount: number; hasNextPage: boolean };
  };
  return {
    ...existing,
    [connectionKey]: {
      ...connection,
      nodes: connection.nodes.filter((node) => node.id !== id),
      pageInfo: {
        ...connection.pageInfo,
        totalCount: Math.max(0, connection.pageInfo.totalCount - 1),
      },
    },
  } as T;
}

function makeCreateUpdater<T extends ListQueryData>(
  document: typeof ListCompaniesDocument,
  connectionKey: keyof T,
): // eslint-disable-next-line @typescript-eslint/no-explicit-any
any {
  return (cache: ApolloCache<unknown>, options: { data?: Record<string, unknown> | null }) => {
    const created = Object.values(options.data ?? {})[0];
    if (!created) return;
    cache.updateQuery({ query: document, variables: { pagination: LIST_PAGINATION } }, (existing) =>
      prependNode(existing as T | null, connectionKey, created),
    );
  };
}

function makeDeleteUpdater<T extends ListQueryData>(
  document: typeof ListCompaniesDocument,
  connectionKey: keyof T,
  typename: string,
): // eslint-disable-next-line @typescript-eslint/no-explicit-any
any {
  return (cache: ApolloCache<unknown>, _unused: unknown, options: { variables?: { id?: string } }) => {
    const id = options.variables?.id;
    if (!id) return;
    cache.updateQuery({ query: document, variables: { pagination: LIST_PAGINATION } }, (existing) =>
      removeNode(existing as T | null, connectionKey, id),
    );
    cache.evict({ id: cache.identify({ __typename: typename, id }) });
    cache.gc();
  };
}

export function useCrmEntity(entity: CrmListEntity, skip = false) {
  const companiesQuery = useListCompaniesQuery({
    skip: skip || entity !== "companies",
    variables: { pagination: LIST_PAGINATION },
  });
  const contactsQuery = useListContactsQuery({
    skip: skip || entity !== "contacts",
    variables: { pagination: LIST_PAGINATION },
  });
  const leadsQuery = useListLeadsQuery({
    skip: skip || entity !== "leads",
    variables: { pagination: LIST_PAGINATION },
  });
  const dealsQuery = useListDealsQuery({
    skip: skip || entity !== "deals",
    variables: { pagination: LIST_PAGINATION },
  });
  const tasksQuery = useListTasksQuery({
    skip: skip || entity !== "tasks",
    variables: { pagination: LIST_PAGINATION },
  });

  const [createCompany, createCompanyState] = useCreateCompanyMutation({
    update: makeCreateUpdater(ListCompaniesDocument, "companies"),
  });
  const [deleteCompany, deleteCompanyState] = useDeleteCompanyMutation({
    update: makeDeleteUpdater(ListCompaniesDocument, "companies", "Company"),
  });

  const [createContact, createContactState] = useCreateContactMutation({
    update: makeCreateUpdater(ListContactsDocument, "contacts"),
  });
  const [deleteContact, deleteContactState] = useDeleteContactMutation({
    update: makeDeleteUpdater(ListContactsDocument, "contacts", "Contact"),
  });

  const [createLead, createLeadState] = useCreateLeadMutation({
    update: makeCreateUpdater(ListLeadsDocument, "leads"),
  });
  const [deleteLead, deleteLeadState] = useDeleteLeadMutation({
    update: makeDeleteUpdater(ListLeadsDocument, "leads", "Lead"),
  });

  const [createDeal, createDealState] = useCreateDealMutation({
    update: makeCreateUpdater(ListDealsDocument, "deals"),
  });
  const [deleteDeal, deleteDealState] = useDeleteDealMutation({
    update: makeDeleteUpdater(ListDealsDocument, "deals", "Deal"),
  });

  const [createTask, createTaskState] = useCreateTaskMutation({
    update: makeCreateUpdater(ListTasksDocument, "tasks"),
  });
  const [deleteTask, deleteTaskState] = useDeleteTaskMutation({
    update: makeDeleteUpdater(ListTasksDocument, "tasks", "Task"),
  });

  const config = {
    companies: {
      items: (companiesQuery.data?.companies.nodes ?? []).map(mapCompany),
      loading: companiesQuery.loading,
      error: companiesQuery.error,
      creating: createCompanyState.loading,
      deleting: deleteCompanyState.loading,
      create: (payload: Record<string, unknown>) =>
        createCompany({ variables: { input: toGraphqlInput(payload) as never } }),
      delete: (id: string) => deleteCompany({ variables: { id } }),
    },
    contacts: {
      items: (contactsQuery.data?.contacts.nodes ?? []).map(mapContact),
      loading: contactsQuery.loading,
      error: contactsQuery.error,
      creating: createContactState.loading,
      deleting: deleteContactState.loading,
      create: (payload: Record<string, unknown>) =>
        createContact({ variables: { input: toGraphqlInput(payload) as never } }),
      delete: (id: string) => deleteContact({ variables: { id } }),
    },
    leads: {
      items: (leadsQuery.data?.leads.nodes ?? []).map(mapLead),
      loading: leadsQuery.loading,
      error: leadsQuery.error,
      creating: createLeadState.loading,
      deleting: deleteLeadState.loading,
      create: (payload: Record<string, unknown>) =>
        createLead({ variables: { input: toGraphqlInput(payload) as never } }),
      delete: (id: string) => deleteLead({ variables: { id } }),
    },
    deals: {
      items: (dealsQuery.data?.deals.nodes ?? []).map(mapDeal),
      loading: dealsQuery.loading,
      error: dealsQuery.error,
      creating: createDealState.loading,
      deleting: deleteDealState.loading,
      create: (payload: Record<string, unknown>) =>
        createDeal({ variables: { input: toGraphqlInput(payload) as never } }),
      delete: (id: string) => deleteDeal({ variables: { id } }),
    },
    tasks: {
      items: (tasksQuery.data?.tasks.nodes ?? []).map(mapTask),
      loading: tasksQuery.loading,
      error: tasksQuery.error,
      creating: createTaskState.loading,
      deleting: deleteTaskState.loading,
      create: (payload: Record<string, unknown>) =>
        createTask({ variables: { input: toGraphqlInput(payload) as never } }),
      delete: (id: string) => deleteTask({ variables: { id } }),
    },
  } as const;

  return config[entity] as {
    items: CrmEntityItem[];
    loading: boolean;
    error: Error | undefined;
    creating: boolean;
    deleting: boolean;
    create: (payload: Record<string, unknown>) => Promise<unknown>;
    delete: (id: string) => Promise<unknown>;
  };
}
