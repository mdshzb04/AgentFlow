import { toast } from "sonner";

import { ApiError } from "@/lib/api";

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) {
    return typeof error.message === "string" ? error.message : fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function toastError(error: unknown, fallback?: string) {
  toast.error(getErrorMessage(error, fallback));
}

export function toastSuccess(message: string) {
  toast.success(message);
}

export async function withToast<T>(
  promise: Promise<T>,
  messages?: { loading?: string; success?: string; error?: string },
): Promise<T> {
  const result = await toast.promise(promise, {
    loading: messages?.loading ?? "Working…",
    success: messages?.success ?? "Done",
    error: (err) => getErrorMessage(err, messages?.error),
  });
  return result as T;
}

export { toast };
