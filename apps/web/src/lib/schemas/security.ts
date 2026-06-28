import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Enter a valid email address"),
  subject: z.string().min(1, "Subject is required").max(255),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export const publicWebhookSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Enter a valid email address"),
  use_case: z.string().max(2000).optional(),
});

export const webhookCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ContactFormValues = z.infer<typeof contactSchema>;
export type PublicWebhookFormValues = z.infer<typeof publicWebhookSchema>;
export type WebhookCreateFormValues = z.infer<typeof webhookCreateSchema>;
