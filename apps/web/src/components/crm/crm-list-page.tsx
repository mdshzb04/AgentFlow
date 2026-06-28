"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";

import { CrmRecordDetails, type CrmDetailField } from "@/components/crm/crm-record-details";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { type CrmListEntity, useCrmEntity } from "@/lib/graphql/use-crm-entity";
import { toastError, toastSuccess } from "@/lib/toast";

export interface CrmField {
  key: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "textarea" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
}

interface CrmListPageProps<T extends { id: string; created_at?: string; updated_at?: string }> {
  title: string;
  description: string;
  entity: CrmListEntity;
  fields: CrmField[];
  renderItem: (item: T) => { title: string; subtitle?: string; badges?: string[] };
  renderDetailFields?: (item: T) => CrmDetailField[];
  defaultValues?: Record<string, string>;
}

export function CrmListPage<T extends { id: string; created_at?: string; updated_at?: string }>({
  title,
  description,
  entity,
  fields,
  renderItem,
  renderDetailFields,
  defaultValues = {},
}: CrmListPageProps<T>) {
  const { isAuthenticated } = useAuth();
  const { items, loading, error, creating, create, delete: deleteRecord } = useCrmEntity(
    entity,
    !isAuthenticated,
  );
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(defaultValues);

  useEffect(() => {
    if (error) {
      toastError(error, `Failed to load ${title.toLowerCase()}`);
    }
  }, [error, title]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const val = form[field.key];
        if (val === "" || val === undefined) continue;
        payload[field.key] = field.type === "number" ? Number(val) : val;
      }
      await create(payload);
      setForm(defaultValues);
      setShowForm(false);
      toastSuccess(`${title.replace(/s$/, "")} created`);
    } catch (err) {
      toastError(err, `Failed to create ${title.replace(/s$/, "").toLowerCase()}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteRecord(id);
      if (expandedId === id) setExpandedId(null);
      toastSuccess("Record deleted");
    } catch (err) {
      toastError(err, "Failed to delete record");
    }
  };

  const typedItems = items as unknown as T[];

  return (
    <DashboardShell>
      <DashboardHeader title={title} description={description} />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {typedItems.length} record{typedItems.length === 1 ? "" : "s"}
          </p>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 size-4" />
            Add {title.replace(/s$/, "")}
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New record</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={field.key}
                        value={form[field.key] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    ) : field.type === "select" && field.options ? (
                      <Select
                        value={form[field.key] ?? field.options[0]?.value}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, [field.key]: v ?? "" }))
                        }
                      >
                        <SelectTrigger id={field.key}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field.key}
                        type={field.type === "number" ? "number" : field.type ?? "text"}
                        value={form[field.key] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit" disabled={creating}>
                    {creating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                    Save
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </CardHeader>
                <CardContent className="flex gap-1.5 pt-0">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : typedItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No records yet. Create one or let a workflow populate CRM data automatically.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {typedItems.map((item) => {
              const { title: itemTitle, subtitle, badges } = renderItem(item);
              const isExpanded = expandedId === item.id;
              return (
                <Card key={item.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{itemTitle}</CardTitle>
                      {subtitle && <CardDescription>{subtitle}</CardDescription>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="mr-1 size-4" />
                        ) : (
                          <ChevronDown className="mr-1 size-4" />
                        )}
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => void handleDelete(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {badges && badges.length > 0 && (
                    <CardContent className="flex flex-wrap gap-1.5 pt-0">
                      {badges.map((b) => (
                        <Badge key={b} variant="secondary">
                          {b}
                        </Badge>
                      ))}
                    </CardContent>
                  )}
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <CrmRecordDetails
                        id={item.id}
                        createdAt={item.created_at}
                        updatedAt={item.updated_at}
                        extraFields={renderDetailFields?.(item)}
                      />
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
