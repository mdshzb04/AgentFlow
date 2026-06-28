"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Webhook } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/security/form-alert";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  publicWebhookSchema,
  type PublicWebhookFormValues,
} from "@/lib/schemas/security";
import { submitPublicWebhookRequest } from "@/lib/security";

export default function PublicWebhookPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PublicWebhookFormValues>({
    resolver: zodResolver(publicWebhookSchema),
    defaultValues: {
      name: "",
      email: "",
      use_case: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSuccessMessage(null);
    try {
      const result = await submitPublicWebhookRequest({
        ...values,
        use_case: values.use_case || undefined,
      });
      setSuccessMessage(result.message);
      reset();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to submit webhook request.",
      );
    }
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="container mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="size-5" />
              Request webhook access
            </CardTitle>
            <CardDescription>
              Submit a request to receive inbound webhook endpoints for your integrations.
              Our team reviews all public webhook requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <FormAlert variant="success" message={successMessage} className="mb-4" />
            )}
            {submitError && (
              <FormAlert variant="error" message={submitError} className="mb-4" />
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" autoComplete="name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="use_case">How will you use webhooks?</Label>
                <Textarea
                  id="use_case"
                  rows={4}
                  placeholder="e.g. Trigger workflows from Stripe payment events"
                  {...register("use_case")}
                />
                {errors.use_case && (
                  <p className="text-sm text-destructive">{errors.use_case.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Submit request
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/dashboard/integrations" className="underline-offset-4 hover:underline">
                Create webhooks in the dashboard
              </Link>
              {" · "}
              <Link href="/" className="underline-offset-4 hover:underline">
                Home
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
