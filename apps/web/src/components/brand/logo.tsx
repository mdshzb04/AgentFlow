import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

const sizePx = {
  sm: 32,
  md: 40,
  lg: 56,
} as const;

interface LogoProps {
  size?: keyof typeof sizePx;
  className?: string;
  href?: string;
  priority?: boolean;
}

export function Logo({ size = "sm", className, href = "/", priority = false }: LogoProps) {
  const height = sizePx[size];

  const image = (
    <Image
      src="/logo-icon.png"
      alt="AgentFlow"
      width={573}
      height={310}
      priority={priority}
      className={cn("block shrink-0 object-contain object-left", className)}
      style={{ height, width: "auto", maxHeight: height }}
    />
  );

  if (!href) {
    return image;
  }

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center leading-none"
      style={{ maxHeight: height }}
    >
      {image}
    </Link>
  );
}
