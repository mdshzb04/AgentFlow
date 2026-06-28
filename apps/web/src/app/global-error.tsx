"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
        <AlertTriangle className="size-10 text-destructive" />
        <h1 className="text-xl font-semibold">Application error</h1>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {error.message || "A critical error occurred."}
        </p>
        <Button onClick={reset}>Reload</Button>
      </body>
    </html>
  );
}
