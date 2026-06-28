"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthFooterLinks, AuthFormShell } from "@/components/auth/auth-form-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { FormAlert } from "@/components/security/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { signupSchema, type SignupFormValues } from "@/lib/schemas/security";
import { initGitHubLogin, submitSignup } from "@/lib/security";

function GitHubIcon() {
  return (
    <svg className="mr-2 size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setSubmitError(null);
    try {
      const { access_token } = await submitSignup({ name, email, password });
      await login(access_token);
      router.replace("/dashboard");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Signup failed. Please try again.");
    }
  });

  const onGitHubSignup = async () => {
    setSubmitError(null);
    setIsGitHubLoading(true);
    try {
      const { redirect_url } = await initGitHubLogin();
      window.location.href = redirect_url;
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "GitHub sign-up failed.");
      setIsGitHubLoading(false);
    }
  };

  return (
    <AuthFormShell
      title="Create your account"
      description="Sign up with email or continue with GitHub"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="underline-offset-4 hover:underline">
            Sign in
          </Link>
          <br className="my-2" />
          <AuthFooterLinks />
        </>
      }
    >
      {submitError && <FormAlert variant="error" message={submitError} />}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || isGitHubLoading}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isGitHubLoading || isSubmitting}
        onClick={() => void onGitHubSignup()}
      >
        {isGitHubLoading ? (
          <Loader2 className="mr-2 size-5 animate-spin" />
        ) : (
          <GitHubIcon />
        )}
        Continue with GitHub
      </Button>
    </AuthFormShell>
  );
}
