"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";

import { CrmRecordDetails } from "@/components/crm/crm-record-details";
import { RelatedRecordPicker } from "@/components/crm/related-record-picker";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ListNotesDocument,
  useCreateNoteMutation,
  useCrmRecordLabelsQuery,
  useDeleteNoteMutation,
  useListNotesQuery,
  type ListNotesQuery,
} from "@/graphql/generated/graphql";
import {
  CRM_RELATED_TYPE_OPTIONS,
  relatedTypeLabel,
  type CrmRelatedType,
} from "@/lib/crm-records";
import { mapNote } from "@/lib/graphql/crm-mappers";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Note } from "@/types/crm";

const LIST_PAGINATION = { limit: 100, offset: 0 };

export default function NotesPage() {
  const { isAuthenticated } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [relatedType, setRelatedType] = useState<CrmRelatedType>("lead");
  const [relatedId, setRelatedId] = useState<string | null>(null);

  const { data, loading, error } = useListNotesQuery({
    skip: !isAuthenticated,
    variables: { pagination: LIST_PAGINATION },
  });

  const { data: labelsData } = useCrmRecordLabelsQuery({
    skip: !isAuthenticated,
    fetchPolicy: "cache-first",
  });

  const [createNote] = useCreateNoteMutation({
    update(cache, { data: result }) {
      if (!result?.createNote) return;
      cache.updateQuery(
        { query: ListNotesDocument, variables: { pagination: LIST_PAGINATION } },
        (existing: ListNotesQuery | null) => {
          if (!existing?.notes) return existing;
          return {
            notes: {
              ...existing.notes,
              nodes: [result.createNote, ...existing.notes.nodes],
              pageInfo: {
                ...existing.notes.pageInfo,
                totalCount: existing.notes.pageInfo.totalCount + 1,
              },
            },
          };
        },
      );
    },
  });

  const [deleteNote] = useDeleteNoteMutation({
    update(cache, _, { variables }) {
      const id = variables?.id;
      if (!id) return;
      cache.updateQuery(
        { query: ListNotesDocument, variables: { pagination: LIST_PAGINATION } },
        (existing: ListNotesQuery | null) => {
          if (!existing?.notes) return existing;
          return {
            notes: {
              ...existing.notes,
              nodes: existing.notes.nodes.filter((node: { id: string }) => node.id !== id),
              pageInfo: {
                ...existing.notes.pageInfo,
                totalCount: Math.max(0, existing.notes.pageInfo.totalCount - 1),
              },
            },
          };
        },
      );
      cache.evict({ id: cache.identify({ __typename: "Note", id }) });
      cache.gc();
    },
  });

  const notes = useMemo<Note[]>(
    () => (data?.notes.nodes ?? []).map(mapNote),
    [data?.notes.nodes],
  );

  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    const labels = labelsData?.crmRecordLabels;
    if (!labels) return map;
    for (const group of [
      labels.companies,
      labels.contacts,
      labels.leads,
      labels.deals,
      labels.tasks,
    ]) {
      for (const row of group) {
        map.set(row.id, row.label);
      }
    }
    return map;
  }, [labelsData]);

  useEffect(() => {
    if (error) toastError(error, "Failed to load notes");
  }, [error]);

  const resetForm = () => {
    setBody("");
    setRelatedType("lead");
    setRelatedId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relatedId) {
      toastError(new Error("Select a related record"));
      return;
    }

    setIsCreating(true);
    try {
      await createNote({
        variables: {
          input: {
            body: body.trim(),
            relatedType,
            relatedId,
          },
        },
      });
      resetForm();
      setShowForm(false);
      toastSuccess("Note saved");
    } catch (err) {
      toastError(err, "Failed to save note");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await deleteNote({ variables: { id } });
      if (expandedId === id) setExpandedId(null);
      toastSuccess("Note deleted");
    } catch (err) {
      toastError(err, "Failed to delete note");
    }
  };

  const relatedRecordLabel = (relatedIdValue: string) =>
    labelMap.get(relatedIdValue) ?? `${relatedIdValue.slice(0, 8)}…`;

  return (
    <DashboardShell>
      <DashboardHeader
        title="Notes"
        description="Notes attached to CRM records"
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {notes.length} record{notes.length === 1 ? "" : "s"}
          </p>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 size-4" />
            Add Note
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New note</CardTitle>
              <CardDescription>
                Attach a note to an existing lead, contact, company, deal, or task.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid gap-4">
                <div>
                  <Label htmlFor="note-body">Note</Label>
                  <Textarea
                    id="note-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your note…"
                    required
                    className="min-h-28"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="related-type">Related to</Label>
                    <Select
                      value={relatedType}
                      onValueChange={(value) => {
                        if (!value) return;
                        setRelatedType(value as CrmRelatedType);
                        setRelatedId(null);
                      }}
                    >
                      <SelectTrigger id="related-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CRM_RELATED_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <RelatedRecordPicker
                    relatedType={relatedType}
                    value={relatedId}
                    onChange={setRelatedId}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isCreating || !relatedId}>
                    {isCreating && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                  >
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
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No notes yet. Add one linked to a CRM record.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {notes.map((note) => {
              const isExpanded = expandedId === note.id;
              return (
                <Card key={note.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">
                        {note.body.length > 80 ? `${note.body.slice(0, 80)}…` : note.body}
                      </CardTitle>
                      <CardDescription>
                        {relatedTypeLabel(note.related_type)} · {relatedRecordLabel(note.related_id)}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : note.id)}
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
                        onClick={() => void handleDelete(note.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="space-y-3 pt-0">
                      <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                        {note.body}
                      </div>
                      <CrmRecordDetails
                        id={note.id}
                        createdAt={note.created_at}
                        updatedAt={note.updated_at}
                        extraFields={[
                          { label: "Related type", value: relatedTypeLabel(note.related_type) },
                          { label: "Related record", value: relatedRecordLabel(note.related_id) },
                          { label: "Related record ID", value: note.related_id },
                        ]}
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
