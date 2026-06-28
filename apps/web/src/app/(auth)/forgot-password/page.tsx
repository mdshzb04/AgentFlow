"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthFooterLinks, AuthFormShell } from "@/components/auth/auth-form-shell";
import { FormAlert } from "@/components/security/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/schemas/security";
import { submitForgotPassword } from "@/lib/security";

export default function ForgotPasswordPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSuccessMessage(null);
    try {
      const result = await submitForgotPassword(values);
      setSuccessMessage(result.message);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Request failed. Please try again.",
      );
    }
  });

  return (
    <AuthFormShell
      title="Reset your password"
      description="Enter your email and we'll send recovery instructions if an account exists"
      footer={
        <>
          <Link href="/login" className="underline-offset-4 hover:underline">
            Back to sign in
          </Link>
          <br className="my-2" />
          <AuthFooterLinks />
        </>
      }
    >
      {successMessage && <FormAlert variant="success" message={successMessage} />}
      {submitError && <FormAlert variant="error" message={submitError} />}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Send reset instructions
        </Button>
      </form>
    </AuthFormShell>
  );
}
