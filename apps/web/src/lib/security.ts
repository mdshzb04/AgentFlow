import { apiRequest } from "@/lib/api";

interface MessageResponse {
  message: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export function initGitHubLogin(): Promise<{ redirect_url: string }> {
  return apiRequest<{ redirect_url: string }>("/api/v1/auth/github/login", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function submitSignup(data: {
  name: string;
  email: string;
  password: string;
}): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function submitLogin(data: {
  email: string;
  password: string;
}): Promise<TokenResponse> {
  return apiRequest<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function submitForgotPassword(data: { email: string }): Promise<MessageResponse> {
  return apiRequest<MessageResponse>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function submitContact(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<MessageResponse> {
  return apiRequest<MessageResponse>("/api/v1/contact", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function submitPublicWebhookRequest(data: {
  name: string;
  email: string;
  use_case?: string;
}): Promise<{ id: string; message: string }> {
  return apiRequest<{ id: string; message: string }>("/api/v1/public/webhooks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
