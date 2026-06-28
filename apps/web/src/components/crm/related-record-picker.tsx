"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCrmRecordLabelsQuery,
} from "@/graphql/generated/graphql";
import {
  type CrmRecordOption,
  type CrmRelatedType,
  listRelatedRecordOptions,
} from "@/lib/crm-records";
import { cn } from "@/lib/utils";

export function RelatedRecordPicker({
  relatedType,
  value,
  onChange,
  disabled,
}: {
  relatedType: CrmRelatedType;
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<CrmRecordOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Prefetch all labels in one GraphQL query; picker reads from Apollo cache.
  useCrmRecordLabelsQuery({ fetchPolicy: "cache-first" });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setOptions([]);
    setSearch("");
    setOpen(false);

    void listRelatedRecordOptions(relatedType)
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Failed to load records");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [relatedType]);

  const selected = options.find((opt) => opt.id === value) ?? null;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.subtitle?.toLowerCase().includes(query) ||
        opt.id.toLowerCase().includes(query),
    );
  }, [options, search]);

  return (
    <div className="space-y-2">
      <Label>Related record</Label>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
          disabled={disabled || isLoading}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="truncate text-left">
            {isLoading ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Loading {relatedType}s…
              </span>
            ) : selected ? (
              selected.label
            ) : (
              <span className="text-muted-foreground">Select a {relatedType}…</span>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>

        {open && !isLoading && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover p-2 shadow-md">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${relatedType}s…`}
              className="mb-2"
            />
            <div className="max-h-56 overflow-auto">
              {loadError ? (
                <p className="px-2 py-3 text-sm text-destructive">{loadError}</p>
              ) : filtered.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  {options.length === 0
                    ? `No ${relatedType}s found. Create one first.`
                    : "No matches for your search."}
                </p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-muted",
                      value === opt.id && "bg-muted",
                    )}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        value === opt.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{opt.label}</span>
                      {opt.subtitle && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {opt.subtitle}
                        </span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
