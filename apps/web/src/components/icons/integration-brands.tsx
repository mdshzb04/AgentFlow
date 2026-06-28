import Image from "next/image";

import { GitHubIcon } from "@/components/icons/github";
import { cn } from "@/lib/utils";

export type IntegrationBrandId =
  | "openai"
  | "claude"
  | "gmail"
  | "sheets"
  | "github"
  | "n8n"
  | "notion"
  | "webhooks"
  | "postgresql";

const BRAND_META: Record<
  IntegrationBrandId,
  { local?: string; useGitHubSvg?: boolean; lightBg?: boolean }
> = {
  openai: { local: "/integrations/openai.png", lightBg: true },
  claude: { local: "/integrations/claude.svg" },
  gmail: { local: "/integrations/gmail.png" },
  sheets: { local: "/integrations/sheets.svg" },
  github: { useGitHubSvg: true },
  n8n: { local: "/integrations/n8n.svg" },
  notion: { local: "/integrations/notion.svg", lightBg: true },
  webhooks: {},
  postgresql: { local: "/integrations/postgresql.svg" },
};

function WebhookBrandIcon() {
  return (
    <svg className="size-full" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function IntegrationBrandLogo({
  brand,
  className,
  size = 20,
}: {
  brand: IntegrationBrandId;
  className?: string;
  size?: number;
}) {
  const meta = BRAND_META[brand];

  if (meta.useGitHubSvg) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <GitHubIcon className="size-full text-white" />
      </span>
    );
  }

  if (brand === "webhooks") {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center text-cyan-300", className)}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <WebhookBrandIcon />
      </span>
    );
  }

  if (meta.local) {
    if (meta.lightBg) {
      return (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-md bg-white p-0.5",
            className,
          )}
          style={{ width: size, height: size }}
          aria-hidden
        >
          <Image
            src={meta.local}
            alt=""
            width={size - 4}
            height={size - 4}
            className="object-contain"
            aria-hidden
          />
        </span>
      );
    }
    return (
      <Image
        src={meta.local}
        alt=""
        width={size}
        height={size}
        className={cn("object-contain", className)}
        aria-hidden
      />
    );
  }

  return null;
}

export function integrationLogoLightBg(brand: IntegrationBrandId) {
  return BRAND_META[brand].lightBg ?? false;
}
