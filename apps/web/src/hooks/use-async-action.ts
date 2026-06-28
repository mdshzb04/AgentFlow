"use client";

import { useCallback, useState } from "react";

import { getErrorMessage, toastError, toastSuccess } from "@/lib/toast";

interface RunOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
}

export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>, options?: RunOptions) => {
    setIsLoading(true);
    try {
      const result = await fn();
      if (options?.successMessage) {
        toastSuccess(options.successMessage);
      }
      options?.onSuccess?.();
      return result;
    } catch (error) {
      toastError(error, options?.errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { run, isLoading };
}

export function useAsyncState<T>(initial: T | null = null) {
  const [data, setData] = useState<T | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (fn: () => Promise<T>, options?: { errorMessage?: string; silent?: boolean }) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fn();
        setData(result);
        return result;
      } catch (err) {
        const message = getErrorMessage(err, options?.errorMessage);
        setError(message);
        if (!options?.silent) {
          toastError(err, options?.errorMessage);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { data, error, isLoading, execute, setData };
}
