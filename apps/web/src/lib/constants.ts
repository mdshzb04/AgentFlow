export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const AUTH_COOKIE_NAME = "agentflow_token";
export const AUTH_TOKEN_KEY = "agentflow_token";

export const NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "Contacts", href: "/dashboard/contacts", icon: "Users", disabled: true },
  { title: "Deals", href: "/dashboard/deals", icon: "Handshake", disabled: true },
  { title: "Settings", href: "/dashboard/settings", icon: "Settings", disabled: true },
] as const;
