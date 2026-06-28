/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type CompanyCreateInput = {
  address?: string | null | undefined;
  domain?: string | null | undefined;
  industry?: string | null | undefined;
  name: string;
  phone?: string | null | undefined;
  size?: string | null | undefined;
  website?: string | null | undefined;
};

export type ContactCreateInput = {
  companyId?: string | number | null | undefined;
  email?: string | null | undefined;
  firstName: string;
  lastName: string;
  phone?: string | null | undefined;
  status?: string | null | undefined;
  title?: string | null | undefined;
};

/** Shared list filters for CRM entities. */
export type CrmListFilter = {
  createdAfter?: string | null | undefined;
  createdBefore?: string | null | undefined;
  search?: string | null | undefined;
  sortBy?: string | null | undefined;
  sortDirection?: SortDirection | null | undefined;
  status?: string | null | undefined;
};

export type DealCreateInput = {
  amount?: number | null | undefined;
  closeDate?: string | null | undefined;
  companyId?: string | number | null | undefined;
  contactId?: string | number | null | undefined;
  currency?: string | null | undefined;
  name: string;
  probability?: number | null | undefined;
  stage?: DealStage | null | undefined;
};

export type DealStage =
  | 'closed_lost'
  | 'closed_won'
  | 'negotiation'
  | 'proposal'
  | 'prospecting'
  | 'qualification';

export type LeadCreateInput = {
  companyId?: string | number | null | undefined;
  contactId?: string | number | null | undefined;
  email?: string | null | undefined;
  notesSummary?: string | null | undefined;
  phone?: string | null | undefined;
  score?: number | null | undefined;
  source?: string | null | undefined;
  status?: LeadStatus | null | undefined;
  title: string;
  value?: number | null | undefined;
};

export type LeadStatus =
  | 'contacted'
  | 'converted'
  | 'lost'
  | 'new'
  | 'qualified';

export type NoteCreateInput = {
  body: string;
  relatedId: string | number;
  relatedType: string;
};

/** Offset-based pagination. */
export type PaginationInput = {
  limit?: number | null | undefined;
  offset?: number | null | undefined;
};

export type SortDirection =
  | 'ASC'
  | 'DESC';

export type TaskCreateInput = {
  description?: string | null | undefined;
  dueDate?: string | null | undefined;
  priority?: TaskPriority | null | undefined;
  relatedId?: string | number | null | undefined;
  relatedType?: string | null | undefined;
  status?: TaskStatus | null | undefined;
  title: string;
};

export type TaskPriority =
  | 'high'
  | 'low'
  | 'medium';

export type TaskStatus =
  | 'cancelled'
  | 'completed'
  | 'in_progress'
  | 'pending';

export type CompanyFieldsFragment = { id: string, name: string, domain: string | null, industry: string | null, size: string | null, website: string | null, phone: string | null, address: string | null, createdAt: string, updatedAt: string };

export type ContactFieldsFragment = { id: string, companyId: string | null, firstName: string, lastName: string, email: string | null, phone: string | null, title: string | null, status: string, createdAt: string, updatedAt: string };

export type LeadFieldsFragment = { id: string, companyId: string | null, contactId: string | null, title: string, source: string | null, status: LeadStatus, score: number | null, value: number | null, email: string | null, phone: string | null, notesSummary: string | null, createdAt: string, updatedAt: string };

export type DealFieldsFragment = { id: string, companyId: string | null, contactId: string | null, name: string, stage: DealStage, amount: number | null, currency: string, probability: number | null, closeDate: string | null, createdAt: string, updatedAt: string };

export type TaskFieldsFragment = { id: string, title: string, description: string | null, status: TaskStatus, priority: TaskPriority, dueDate: string | null, relatedType: string | null, relatedId: string | null, createdAt: string, updatedAt: string };

export type NoteFieldsFragment = { id: string, body: string, relatedType: string, relatedId: string, createdAt: string, updatedAt: string };

export type ListCompaniesQueryVariables = Exact<{
  filters?: CrmListFilter | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type ListCompaniesQuery = { companies: { nodes: Array<{ id: string, name: string, domain: string | null, industry: string | null, size: string | null, website: string | null, phone: string | null, address: string | null, createdAt: string, updatedAt: string }>, pageInfo: { totalCount: number, hasNextPage: boolean } } };

export type ListContactsQueryVariables = Exact<{
  filters?: CrmListFilter | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type ListContactsQuery = { contacts: { nodes: Array<{ id: string, companyId: string | null, firstName: string, lastName: string, email: string | null, phone: string | null, title: string | null, status: string, createdAt: string, updatedAt: string }>, pageInfo: { totalCount: number, hasNextPage: boolean } } };

export type ListLeadsQueryVariables = Exact<{
  filters?: CrmListFilter | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type ListLeadsQuery = { leads: { nodes: Array<{ id: string, companyId: string | null, contactId: string | null, title: string, source: string | null, status: LeadStatus, score: number | null, value: number | null, email: string | null, phone: string | null, notesSummary: string | null, createdAt: string, updatedAt: string }>, pageInfo: { totalCount: number, hasNextPage: boolean } } };

export type ListDealsQueryVariables = Exact<{
  filters?: CrmListFilter | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type ListDealsQuery = { deals: { nodes: Array<{ id: string, companyId: string | null, contactId: string | null, name: string, stage: DealStage, amount: number | null, currency: string, probability: number | null, closeDate: string | null, createdAt: string, updatedAt: string }>, pageInfo: { totalCount: number, hasNextPage: boolean } } };

export type ListTasksQueryVariables = Exact<{
  filters?: CrmListFilter | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type ListTasksQuery = { tasks: { nodes: Array<{ id: string, title: string, description: string | null, status: TaskStatus, priority: TaskPriority, dueDate: string | null, relatedType: string | null, relatedId: string | null, createdAt: string, updatedAt: string }>, pageInfo: { totalCount: number, hasNextPage: boolean } } };

export type ListNotesQueryVariables = Exact<{
  relatedType?: string | null | undefined;
  relatedId?: string | number | null | undefined;
  filters?: CrmListFilter | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type ListNotesQuery = { notes: { nodes: Array<{ id: string, body: string, relatedType: string, relatedId: string, createdAt: string, updatedAt: string }>, pageInfo: { totalCount: number, hasNextPage: boolean } } };

export type CrmRecordLabelsQueryVariables = Exact<{ [key: string]: never; }>;


export type CrmRecordLabelsQuery = { crmRecordLabels: { companies: Array<{ id: string, label: string, subtitle: string | null, relatedType: string | null }>, contacts: Array<{ id: string, label: string, subtitle: string | null, relatedType: string | null }>, leads: Array<{ id: string, label: string, subtitle: string | null, relatedType: string | null }>, deals: Array<{ id: string, label: string, subtitle: string | null, relatedType: string | null }>, tasks: Array<{ id: string, label: string, subtitle: string | null, relatedType: string | null }> } };

export type CreateCompanyMutationVariables = Exact<{
  input: CompanyCreateInput;
}>;


export type CreateCompanyMutation = { createCompany: { id: string, name: string, domain: string | null, industry: string | null, size: string | null, website: string | null, phone: string | null, address: string | null, createdAt: string, updatedAt: string } };

export type DeleteCompanyMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteCompanyMutation = { deleteCompany: boolean };

export type CreateContactMutationVariables = Exact<{
  input: ContactCreateInput;
}>;


export type CreateContactMutation = { createContact: { id: string, companyId: string | null, firstName: string, lastName: string, email: string | null, phone: string | null, title: string | null, status: string, createdAt: string, updatedAt: string } };

export type DeleteContactMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteContactMutation = { deleteContact: boolean };

export type CreateLeadMutationVariables = Exact<{
  input: LeadCreateInput;
}>;


export type CreateLeadMutation = { createLead: { id: string, companyId: string | null, contactId: string | null, title: string, source: string | null, status: LeadStatus, score: number | null, value: number | null, email: string | null, phone: string | null, notesSummary: string | null, createdAt: string, updatedAt: string } };

export type DeleteLeadMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteLeadMutation = { deleteLead: boolean };

export type CreateDealMutationVariables = Exact<{
  input: DealCreateInput;
}>;


export type CreateDealMutation = { createDeal: { id: string, companyId: string | null, contactId: string | null, name: string, stage: DealStage, amount: number | null, currency: string, probability: number | null, closeDate: string | null, createdAt: string, updatedAt: string } };

export type DeleteDealMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteDealMutation = { deleteDeal: boolean };

export type CreateTaskMutationVariables = Exact<{
  input: TaskCreateInput;
}>;


export type CreateTaskMutation = { createTask: { id: string, title: string, description: string | null, status: TaskStatus, priority: TaskPriority, dueDate: string | null, relatedType: string | null, relatedId: string | null, createdAt: string, updatedAt: string } };

export type DeleteTaskMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteTaskMutation = { deleteTask: boolean };

export type CreateNoteMutationVariables = Exact<{
  input: NoteCreateInput;
}>;


export type CreateNoteMutation = { createNote: { id: string, body: string, relatedType: string, relatedId: string, createdAt: string, updatedAt: string } };

export type DeleteNoteMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteNoteMutation = { deleteNote: boolean };

export const CompanyFieldsFragmentDoc = gql`
    fragment CompanyFields on Company {
  id
  name
  domain
  industry
  size
  website
  phone
  address
  createdAt
  updatedAt
}
    `;
export const ContactFieldsFragmentDoc = gql`
    fragment ContactFields on Contact {
  id
  companyId
  firstName
  lastName
  email
  phone
  title
  status
  createdAt
  updatedAt
}
    `;
export const LeadFieldsFragmentDoc = gql`
    fragment LeadFields on Lead {
  id
  companyId
  contactId
  title
  source
  status
  score
  value
  email
  phone
  notesSummary
  createdAt
  updatedAt
}
    `;
export const DealFieldsFragmentDoc = gql`
    fragment DealFields on Deal {
  id
  companyId
  contactId
  name
  stage
  amount
  currency
  probability
  closeDate
  createdAt
  updatedAt
}
    `;
export const TaskFieldsFragmentDoc = gql`
    fragment TaskFields on Task {
  id
  title
  description
  status
  priority
  dueDate
  relatedType
  relatedId
  createdAt
  updatedAt
}
    `;
export const NoteFieldsFragmentDoc = gql`
    fragment NoteFields on Note {
  id
  body
  relatedType
  relatedId
  createdAt
  updatedAt
}
    `;
export const ListCompaniesDocument = gql`
    query ListCompanies($filters: CrmListFilter, $pagination: PaginationInput) {
  companies(filters: $filters, pagination: $pagination) {
    nodes {
      ...CompanyFields
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useListCompaniesQuery__
 *
 * To run a query within a React component, call `useListCompaniesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListCompaniesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListCompaniesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListCompaniesQuery(baseOptions?: Apollo.QueryHookOptions<ListCompaniesQuery, ListCompaniesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListCompaniesQuery, ListCompaniesQueryVariables>(ListCompaniesDocument, options);
      }
export function useListCompaniesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListCompaniesQuery, ListCompaniesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListCompaniesQuery, ListCompaniesQueryVariables>(ListCompaniesDocument, options);
        }
// @ts-ignore
export function useListCompaniesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ListCompaniesQuery, ListCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<ListCompaniesQuery, ListCompaniesQueryVariables>;
export function useListCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListCompaniesQuery, ListCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<ListCompaniesQuery | undefined, ListCompaniesQueryVariables>;
export function useListCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListCompaniesQuery, ListCompaniesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListCompaniesQuery, ListCompaniesQueryVariables>(ListCompaniesDocument, options);
        }
export type ListCompaniesQueryHookResult = ReturnType<typeof useListCompaniesQuery>;
export type ListCompaniesLazyQueryHookResult = ReturnType<typeof useListCompaniesLazyQuery>;
export type ListCompaniesSuspenseQueryHookResult = ReturnType<typeof useListCompaniesSuspenseQuery>;
export type ListCompaniesQueryResult = Apollo.QueryResult<ListCompaniesQuery, ListCompaniesQueryVariables>;
export const ListContactsDocument = gql`
    query ListContacts($filters: CrmListFilter, $pagination: PaginationInput) {
  contacts(filters: $filters, pagination: $pagination) {
    nodes {
      ...ContactFields
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
    ${ContactFieldsFragmentDoc}`;

/**
 * __useListContactsQuery__
 *
 * To run a query within a React component, call `useListContactsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListContactsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListContactsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListContactsQuery(baseOptions?: Apollo.QueryHookOptions<ListContactsQuery, ListContactsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListContactsQuery, ListContactsQueryVariables>(ListContactsDocument, options);
      }
export function useListContactsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListContactsQuery, ListContactsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListContactsQuery, ListContactsQueryVariables>(ListContactsDocument, options);
        }
// @ts-ignore
export function useListContactsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ListContactsQuery, ListContactsQueryVariables>): Apollo.UseSuspenseQueryResult<ListContactsQuery, ListContactsQueryVariables>;
export function useListContactsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListContactsQuery, ListContactsQueryVariables>): Apollo.UseSuspenseQueryResult<ListContactsQuery | undefined, ListContactsQueryVariables>;
export function useListContactsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListContactsQuery, ListContactsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListContactsQuery, ListContactsQueryVariables>(ListContactsDocument, options);
        }
export type ListContactsQueryHookResult = ReturnType<typeof useListContactsQuery>;
export type ListContactsLazyQueryHookResult = ReturnType<typeof useListContactsLazyQuery>;
export type ListContactsSuspenseQueryHookResult = ReturnType<typeof useListContactsSuspenseQuery>;
export type ListContactsQueryResult = Apollo.QueryResult<ListContactsQuery, ListContactsQueryVariables>;
export const ListLeadsDocument = gql`
    query ListLeads($filters: CrmListFilter, $pagination: PaginationInput) {
  leads(filters: $filters, pagination: $pagination) {
    nodes {
      ...LeadFields
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
    ${LeadFieldsFragmentDoc}`;

/**
 * __useListLeadsQuery__
 *
 * To run a query within a React component, call `useListLeadsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListLeadsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListLeadsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListLeadsQuery(baseOptions?: Apollo.QueryHookOptions<ListLeadsQuery, ListLeadsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListLeadsQuery, ListLeadsQueryVariables>(ListLeadsDocument, options);
      }
export function useListLeadsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListLeadsQuery, ListLeadsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListLeadsQuery, ListLeadsQueryVariables>(ListLeadsDocument, options);
        }
// @ts-ignore
export function useListLeadsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ListLeadsQuery, ListLeadsQueryVariables>): Apollo.UseSuspenseQueryResult<ListLeadsQuery, ListLeadsQueryVariables>;
export function useListLeadsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListLeadsQuery, ListLeadsQueryVariables>): Apollo.UseSuspenseQueryResult<ListLeadsQuery | undefined, ListLeadsQueryVariables>;
export function useListLeadsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListLeadsQuery, ListLeadsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListLeadsQuery, ListLeadsQueryVariables>(ListLeadsDocument, options);
        }
export type ListLeadsQueryHookResult = ReturnType<typeof useListLeadsQuery>;
export type ListLeadsLazyQueryHookResult = ReturnType<typeof useListLeadsLazyQuery>;
export type ListLeadsSuspenseQueryHookResult = ReturnType<typeof useListLeadsSuspenseQuery>;
export type ListLeadsQueryResult = Apollo.QueryResult<ListLeadsQuery, ListLeadsQueryVariables>;
export const ListDealsDocument = gql`
    query ListDeals($filters: CrmListFilter, $pagination: PaginationInput) {
  deals(filters: $filters, pagination: $pagination) {
    nodes {
      ...DealFields
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
    ${DealFieldsFragmentDoc}`;

/**
 * __useListDealsQuery__
 *
 * To run a query within a React component, call `useListDealsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListDealsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListDealsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListDealsQuery(baseOptions?: Apollo.QueryHookOptions<ListDealsQuery, ListDealsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListDealsQuery, ListDealsQueryVariables>(ListDealsDocument, options);
      }
export function useListDealsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListDealsQuery, ListDealsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListDealsQuery, ListDealsQueryVariables>(ListDealsDocument, options);
        }
// @ts-ignore
export function useListDealsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ListDealsQuery, ListDealsQueryVariables>): Apollo.UseSuspenseQueryResult<ListDealsQuery, ListDealsQueryVariables>;
export function useListDealsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListDealsQuery, ListDealsQueryVariables>): Apollo.UseSuspenseQueryResult<ListDealsQuery | undefined, ListDealsQueryVariables>;
export function useListDealsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListDealsQuery, ListDealsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListDealsQuery, ListDealsQueryVariables>(ListDealsDocument, options);
        }
export type ListDealsQueryHookResult = ReturnType<typeof useListDealsQuery>;
export type ListDealsLazyQueryHookResult = ReturnType<typeof useListDealsLazyQuery>;
export type ListDealsSuspenseQueryHookResult = ReturnType<typeof useListDealsSuspenseQuery>;
export type ListDealsQueryResult = Apollo.QueryResult<ListDealsQuery, ListDealsQueryVariables>;
export const ListTasksDocument = gql`
    query ListTasks($filters: CrmListFilter, $pagination: PaginationInput) {
  tasks(filters: $filters, pagination: $pagination) {
    nodes {
      ...TaskFields
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
    ${TaskFieldsFragmentDoc}`;

/**
 * __useListTasksQuery__
 *
 * To run a query within a React component, call `useListTasksQuery` and pass it any options that fit your needs.
 * When your component renders, `useListTasksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListTasksQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListTasksQuery(baseOptions?: Apollo.QueryHookOptions<ListTasksQuery, ListTasksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListTasksQuery, ListTasksQueryVariables>(ListTasksDocument, options);
      }
export function useListTasksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListTasksQuery, ListTasksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListTasksQuery, ListTasksQueryVariables>(ListTasksDocument, options);
        }
// @ts-ignore
export function useListTasksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ListTasksQuery, ListTasksQueryVariables>): Apollo.UseSuspenseQueryResult<ListTasksQuery, ListTasksQueryVariables>;
export function useListTasksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListTasksQuery, ListTasksQueryVariables>): Apollo.UseSuspenseQueryResult<ListTasksQuery | undefined, ListTasksQueryVariables>;
export function useListTasksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListTasksQuery, ListTasksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListTasksQuery, ListTasksQueryVariables>(ListTasksDocument, options);
        }
export type ListTasksQueryHookResult = ReturnType<typeof useListTasksQuery>;
export type ListTasksLazyQueryHookResult = ReturnType<typeof useListTasksLazyQuery>;
export type ListTasksSuspenseQueryHookResult = ReturnType<typeof useListTasksSuspenseQuery>;
export type ListTasksQueryResult = Apollo.QueryResult<ListTasksQuery, ListTasksQueryVariables>;
export const ListNotesDocument = gql`
    query ListNotes($relatedType: String, $relatedId: ID, $filters: CrmListFilter, $pagination: PaginationInput) {
  notes(
    relatedType: $relatedType
    relatedId: $relatedId
    filters: $filters
    pagination: $pagination
  ) {
    nodes {
      ...NoteFields
    }
    pageInfo {
      totalCount
      hasNextPage
    }
  }
}
    ${NoteFieldsFragmentDoc}`;

/**
 * __useListNotesQuery__
 *
 * To run a query within a React component, call `useListNotesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListNotesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListNotesQuery({
 *   variables: {
 *      relatedType: // value for 'relatedType'
 *      relatedId: // value for 'relatedId'
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListNotesQuery(baseOptions?: Apollo.QueryHookOptions<ListNotesQuery, ListNotesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListNotesQuery, ListNotesQueryVariables>(ListNotesDocument, options);
      }
export function useListNotesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListNotesQuery, ListNotesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListNotesQuery, ListNotesQueryVariables>(ListNotesDocument, options);
        }
// @ts-ignore
export function useListNotesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ListNotesQuery, ListNotesQueryVariables>): Apollo.UseSuspenseQueryResult<ListNotesQuery, ListNotesQueryVariables>;
export function useListNotesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListNotesQuery, ListNotesQueryVariables>): Apollo.UseSuspenseQueryResult<ListNotesQuery | undefined, ListNotesQueryVariables>;
export function useListNotesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListNotesQuery, ListNotesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListNotesQuery, ListNotesQueryVariables>(ListNotesDocument, options);
        }
export type ListNotesQueryHookResult = ReturnType<typeof useListNotesQuery>;
export type ListNotesLazyQueryHookResult = ReturnType<typeof useListNotesLazyQuery>;
export type ListNotesSuspenseQueryHookResult = ReturnType<typeof useListNotesSuspenseQuery>;
export type ListNotesQueryResult = Apollo.QueryResult<ListNotesQuery, ListNotesQueryVariables>;
export const CrmRecordLabelsDocument = gql`
    query CrmRecordLabels {
  crmRecordLabels {
    companies {
      id
      label
      subtitle
      relatedType
    }
    contacts {
      id
      label
      subtitle
      relatedType
    }
    leads {
      id
      label
      subtitle
      relatedType
    }
    deals {
      id
      label
      subtitle
      relatedType
    }
    tasks {
      id
      label
      subtitle
      relatedType
    }
  }
}
    `;

/**
 * __useCrmRecordLabelsQuery__
 *
 * To run a query within a React component, call `useCrmRecordLabelsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCrmRecordLabelsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCrmRecordLabelsQuery({
 *   variables: {
 *   },
 * });
 */
export function useCrmRecordLabelsQuery(baseOptions?: Apollo.QueryHookOptions<CrmRecordLabelsQuery, CrmRecordLabelsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CrmRecordLabelsQuery, CrmRecordLabelsQueryVariables>(CrmRecordLabelsDocument, options);
      }
export function useCrmRecordLabelsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CrmRecordLabelsQuery, CrmRecordLabelsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CrmRecordLabelsQuery, CrmRecordLabelsQueryVariables>(CrmRecordLabelsDocument, options);
        }
// @ts-ignore
export function useCrmRecordLabelsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CrmRecordLabelsQuery, CrmRecordLabelsQueryVariables>): Apollo.UseSuspenseQueryResult<CrmRecordLabelsQuery, CrmRecordLabelsQueryVariables>;
export function useCrmRecordLabelsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CrmRecordLabelsQuery, CrmRecordLabelsQueryVariables>): Apollo.UseSuspenseQueryResult<CrmRecordLabelsQuery | undefined, CrmRecordLabelsQueryVariables>;
export function useCrmRecordLabelsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CrmRecordLabelsQuery, CrmRecordLabelsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CrmRecordLabelsQuery, CrmRecordLabelsQueryVariables>(CrmRecordLabelsDocument, options);
        }
export type CrmRecordLabelsQueryHookResult = ReturnType<typeof useCrmRecordLabelsQuery>;
export type CrmRecordLabelsLazyQueryHookResult = ReturnType<typeof useCrmRecordLabelsLazyQuery>;
export type CrmRecordLabelsSuspenseQueryHookResult = ReturnType<typeof useCrmRecordLabelsSuspenseQuery>;
export type CrmRecordLabelsQueryResult = Apollo.QueryResult<CrmRecordLabelsQuery, CrmRecordLabelsQueryVariables>;
export const CreateCompanyDocument = gql`
    mutation CreateCompany($input: CompanyCreateInput!) {
  createCompany(input: $input) {
    ...CompanyFields
  }
}
    ${CompanyFieldsFragmentDoc}`;
export type CreateCompanyMutationFn = Apollo.MutationFunction<CreateCompanyMutation, CreateCompanyMutationVariables>;

/**
 * __useCreateCompanyMutation__
 *
 * To run a mutation, you first call `useCreateCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCompanyMutation, { data, loading, error }] = useCreateCompanyMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCompanyMutation(baseOptions?: Apollo.MutationHookOptions<CreateCompanyMutation, CreateCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCompanyMutation, CreateCompanyMutationVariables>(CreateCompanyDocument, options);
      }
export type CreateCompanyMutationHookResult = ReturnType<typeof useCreateCompanyMutation>;
export type CreateCompanyMutationResult = Apollo.MutationResult<CreateCompanyMutation>;
export type CreateCompanyMutationOptions = Apollo.BaseMutationOptions<CreateCompanyMutation, CreateCompanyMutationVariables>;
export const DeleteCompanyDocument = gql`
    mutation DeleteCompany($id: ID!) {
  deleteCompany(id: $id)
}
    `;
export type DeleteCompanyMutationFn = Apollo.MutationFunction<DeleteCompanyMutation, DeleteCompanyMutationVariables>;

/**
 * __useDeleteCompanyMutation__
 *
 * To run a mutation, you first call `useDeleteCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCompanyMutation, { data, loading, error }] = useDeleteCompanyMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteCompanyMutation(baseOptions?: Apollo.MutationHookOptions<DeleteCompanyMutation, DeleteCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteCompanyMutation, DeleteCompanyMutationVariables>(DeleteCompanyDocument, options);
      }
export type DeleteCompanyMutationHookResult = ReturnType<typeof useDeleteCompanyMutation>;
export type DeleteCompanyMutationResult = Apollo.MutationResult<DeleteCompanyMutation>;
export type DeleteCompanyMutationOptions = Apollo.BaseMutationOptions<DeleteCompanyMutation, DeleteCompanyMutationVariables>;
export const CreateContactDocument = gql`
    mutation CreateContact($input: ContactCreateInput!) {
  createContact(input: $input) {
    ...ContactFields
  }
}
    ${ContactFieldsFragmentDoc}`;
export type CreateContactMutationFn = Apollo.MutationFunction<CreateContactMutation, CreateContactMutationVariables>;

/**
 * __useCreateContactMutation__
 *
 * To run a mutation, you first call `useCreateContactMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateContactMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createContactMutation, { data, loading, error }] = useCreateContactMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateContactMutation(baseOptions?: Apollo.MutationHookOptions<CreateContactMutation, CreateContactMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateContactMutation, CreateContactMutationVariables>(CreateContactDocument, options);
      }
export type CreateContactMutationHookResult = ReturnType<typeof useCreateContactMutation>;
export type CreateContactMutationResult = Apollo.MutationResult<CreateContactMutation>;
export type CreateContactMutationOptions = Apollo.BaseMutationOptions<CreateContactMutation, CreateContactMutationVariables>;
export const DeleteContactDocument = gql`
    mutation DeleteContact($id: ID!) {
  deleteContact(id: $id)
}
    `;
export type DeleteContactMutationFn = Apollo.MutationFunction<DeleteContactMutation, DeleteContactMutationVariables>;

/**
 * __useDeleteContactMutation__
 *
 * To run a mutation, you first call `useDeleteContactMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteContactMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteContactMutation, { data, loading, error }] = useDeleteContactMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteContactMutation(baseOptions?: Apollo.MutationHookOptions<DeleteContactMutation, DeleteContactMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteContactMutation, DeleteContactMutationVariables>(DeleteContactDocument, options);
      }
export type DeleteContactMutationHookResult = ReturnType<typeof useDeleteContactMutation>;
export type DeleteContactMutationResult = Apollo.MutationResult<DeleteContactMutation>;
export type DeleteContactMutationOptions = Apollo.BaseMutationOptions<DeleteContactMutation, DeleteContactMutationVariables>;
export const CreateLeadDocument = gql`
    mutation CreateLead($input: LeadCreateInput!) {
  createLead(input: $input) {
    ...LeadFields
  }
}
    ${LeadFieldsFragmentDoc}`;
export type CreateLeadMutationFn = Apollo.MutationFunction<CreateLeadMutation, CreateLeadMutationVariables>;

/**
 * __useCreateLeadMutation__
 *
 * To run a mutation, you first call `useCreateLeadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateLeadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createLeadMutation, { data, loading, error }] = useCreateLeadMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateLeadMutation(baseOptions?: Apollo.MutationHookOptions<CreateLeadMutation, CreateLeadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateLeadMutation, CreateLeadMutationVariables>(CreateLeadDocument, options);
      }
export type CreateLeadMutationHookResult = ReturnType<typeof useCreateLeadMutation>;
export type CreateLeadMutationResult = Apollo.MutationResult<CreateLeadMutation>;
export type CreateLeadMutationOptions = Apollo.BaseMutationOptions<CreateLeadMutation, CreateLeadMutationVariables>;
export const DeleteLeadDocument = gql`
    mutation DeleteLead($id: ID!) {
  deleteLead(id: $id)
}
    `;
export type DeleteLeadMutationFn = Apollo.MutationFunction<DeleteLeadMutation, DeleteLeadMutationVariables>;

/**
 * __useDeleteLeadMutation__
 *
 * To run a mutation, you first call `useDeleteLeadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteLeadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteLeadMutation, { data, loading, error }] = useDeleteLeadMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteLeadMutation(baseOptions?: Apollo.MutationHookOptions<DeleteLeadMutation, DeleteLeadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteLeadMutation, DeleteLeadMutationVariables>(DeleteLeadDocument, options);
      }
export type DeleteLeadMutationHookResult = ReturnType<typeof useDeleteLeadMutation>;
export type DeleteLeadMutationResult = Apollo.MutationResult<DeleteLeadMutation>;
export type DeleteLeadMutationOptions = Apollo.BaseMutationOptions<DeleteLeadMutation, DeleteLeadMutationVariables>;
export const CreateDealDocument = gql`
    mutation CreateDeal($input: DealCreateInput!) {
  createDeal(input: $input) {
    ...DealFields
  }
}
    ${DealFieldsFragmentDoc}`;
export type CreateDealMutationFn = Apollo.MutationFunction<CreateDealMutation, CreateDealMutationVariables>;

/**
 * __useCreateDealMutation__
 *
 * To run a mutation, you first call `useCreateDealMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateDealMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createDealMutation, { data, loading, error }] = useCreateDealMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateDealMutation(baseOptions?: Apollo.MutationHookOptions<CreateDealMutation, CreateDealMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateDealMutation, CreateDealMutationVariables>(CreateDealDocument, options);
      }
export type CreateDealMutationHookResult = ReturnType<typeof useCreateDealMutation>;
export type CreateDealMutationResult = Apollo.MutationResult<CreateDealMutation>;
export type CreateDealMutationOptions = Apollo.BaseMutationOptions<CreateDealMutation, CreateDealMutationVariables>;
export const DeleteDealDocument = gql`
    mutation DeleteDeal($id: ID!) {
  deleteDeal(id: $id)
}
    `;
export type DeleteDealMutationFn = Apollo.MutationFunction<DeleteDealMutation, DeleteDealMutationVariables>;

/**
 * __useDeleteDealMutation__
 *
 * To run a mutation, you first call `useDeleteDealMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteDealMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteDealMutation, { data, loading, error }] = useDeleteDealMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteDealMutation(baseOptions?: Apollo.MutationHookOptions<DeleteDealMutation, DeleteDealMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteDealMutation, DeleteDealMutationVariables>(DeleteDealDocument, options);
      }
export type DeleteDealMutationHookResult = ReturnType<typeof useDeleteDealMutation>;
export type DeleteDealMutationResult = Apollo.MutationResult<DeleteDealMutation>;
export type DeleteDealMutationOptions = Apollo.BaseMutationOptions<DeleteDealMutation, DeleteDealMutationVariables>;
export const CreateTaskDocument = gql`
    mutation CreateTask($input: TaskCreateInput!) {
  createTask(input: $input) {
    ...TaskFields
  }
}
    ${TaskFieldsFragmentDoc}`;
export type CreateTaskMutationFn = Apollo.MutationFunction<CreateTaskMutation, CreateTaskMutationVariables>;

/**
 * __useCreateTaskMutation__
 *
 * To run a mutation, you first call `useCreateTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTaskMutation, { data, loading, error }] = useCreateTaskMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTaskMutation(baseOptions?: Apollo.MutationHookOptions<CreateTaskMutation, CreateTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTaskMutation, CreateTaskMutationVariables>(CreateTaskDocument, options);
      }
export type CreateTaskMutationHookResult = ReturnType<typeof useCreateTaskMutation>;
export type CreateTaskMutationResult = Apollo.MutationResult<CreateTaskMutation>;
export type CreateTaskMutationOptions = Apollo.BaseMutationOptions<CreateTaskMutation, CreateTaskMutationVariables>;
export const DeleteTaskDocument = gql`
    mutation DeleteTask($id: ID!) {
  deleteTask(id: $id)
}
    `;
export type DeleteTaskMutationFn = Apollo.MutationFunction<DeleteTaskMutation, DeleteTaskMutationVariables>;

/**
 * __useDeleteTaskMutation__
 *
 * To run a mutation, you first call `useDeleteTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTaskMutation, { data, loading, error }] = useDeleteTaskMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteTaskMutation(baseOptions?: Apollo.MutationHookOptions<DeleteTaskMutation, DeleteTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteTaskMutation, DeleteTaskMutationVariables>(DeleteTaskDocument, options);
      }
export type DeleteTaskMutationHookResult = ReturnType<typeof useDeleteTaskMutation>;
export type DeleteTaskMutationResult = Apollo.MutationResult<DeleteTaskMutation>;
export type DeleteTaskMutationOptions = Apollo.BaseMutationOptions<DeleteTaskMutation, DeleteTaskMutationVariables>;
export const CreateNoteDocument = gql`
    mutation CreateNote($input: NoteCreateInput!) {
  createNote(input: $input) {
    ...NoteFields
  }
}
    ${NoteFieldsFragmentDoc}`;
export type CreateNoteMutationFn = Apollo.MutationFunction<CreateNoteMutation, CreateNoteMutationVariables>;

/**
 * __useCreateNoteMutation__
 *
 * To run a mutation, you first call `useCreateNoteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateNoteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createNoteMutation, { data, loading, error }] = useCreateNoteMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateNoteMutation(baseOptions?: Apollo.MutationHookOptions<CreateNoteMutation, CreateNoteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateNoteMutation, CreateNoteMutationVariables>(CreateNoteDocument, options);
      }
export type CreateNoteMutationHookResult = ReturnType<typeof useCreateNoteMutation>;
export type CreateNoteMutationResult = Apollo.MutationResult<CreateNoteMutation>;
export type CreateNoteMutationOptions = Apollo.BaseMutationOptions<CreateNoteMutation, CreateNoteMutationVariables>;
export const DeleteNoteDocument = gql`
    mutation DeleteNote($id: ID!) {
  deleteNote(id: $id)
}
    `;
export type DeleteNoteMutationFn = Apollo.MutationFunction<DeleteNoteMutation, DeleteNoteMutationVariables>;

/**
 * __useDeleteNoteMutation__
 *
 * To run a mutation, you first call `useDeleteNoteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteNoteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteNoteMutation, { data, loading, error }] = useDeleteNoteMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteNoteMutation(baseOptions?: Apollo.MutationHookOptions<DeleteNoteMutation, DeleteNoteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteNoteMutation, DeleteNoteMutationVariables>(DeleteNoteDocument, options);
      }
export type DeleteNoteMutationHookResult = ReturnType<typeof useDeleteNoteMutation>;
export type DeleteNoteMutationResult = Apollo.MutationResult<DeleteNoteMutation>;
export type DeleteNoteMutationOptions = Apollo.BaseMutationOptions<DeleteNoteMutation, DeleteNoteMutationVariables>;