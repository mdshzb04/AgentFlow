"use client";

import { CopyRecordId } from "@/components/crm/copy-record-id";

export interface CrmDetailField {
  label: string;
  value: string | null | undefined;
}

function formatTimestamp(value: string | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function CrmRecordDetails({
  id,
  createdAt,
  updatedAt,
  extraFields = [],
}: {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  extraFields?: CrmDetailField[];
}) {
  const fields = extraFields.filter((field) => field.value);

  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Record ID</p>
        <CopyRecordId id={id} />
      </div>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Created</dt>
          <dd className="text-foreground">{formatTimestamp(createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Updated</dt>
          <dd className="text-foreground">{formatTimestamp(updatedAt)}</dd>
        </div>
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-muted-foreground">{field.label}</dt>
            <dd className="break-words text-foreground">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
