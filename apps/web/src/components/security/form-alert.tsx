import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface FormAlertProps {
  variant: "success" | "error";
  message: string;
  className?: string;
}

export function FormAlert({ variant, message, className }: FormAlertProps) {
  const isSuccess = variant === "success";

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
        isSuccess
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}
