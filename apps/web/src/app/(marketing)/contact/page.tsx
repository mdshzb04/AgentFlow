"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { contactSchema, type ContactFormValues } from "@/lib/schemas/security";
import { submitContact } from "@/lib/security";

export default function ContactPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSuccessMessage(null);
    try {
      const result = await submitContact(values);
      setSuccessMessage(result.message);
      reset();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to send message.");
    }
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="container mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Contact us</CardTitle>
            <CardDescription>
              Questions about AgentFlow CRM? Send us a message and we will get back to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && <FormAlert variant="success" message={successMessage} className="mb-4" />}
            {submitError && <FormAlert variant="error" message={submitError} className="mb-4" />}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" autoComplete="name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" {...register("subject")} />
                {errors.subject && (
                  <p className="text-sm text-destructive">{errors.subject.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" rows={5} {...register("message")} />
                {errors.message && (
                  <p className="text-sm text-destructive">{errors.message.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Send message
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/" className="underline-offset-4 hover:underline">
                Back to home
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
