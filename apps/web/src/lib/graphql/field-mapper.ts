/** Maps snake_case form keys to GraphQL camelCase input fields. */
const SNAKE_TO_CAMEL: Record<string, string> = {
  first_name: "firstName",
  last_name: "lastName",
  notes_summary: "notesSummary",
  company_id: "companyId",
  contact_id: "contactId",
  close_date: "closeDate",
  due_date: "dueDate",
  related_type: "relatedType",
  related_id: "relatedId",
};

export function toGraphqlInput(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    result[SNAKE_TO_CAMEL[key] ?? key] = value;
  }
  return result;
}
