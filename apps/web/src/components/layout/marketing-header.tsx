import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="shrink-0">
          <Logo size="sm" priority />
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-6 text-sm text-muted-foreground lg:flex">
          <Link href="#features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#platform" className="transition-colors hover:text-foreground">
            Platform
          </Link>
          <Link href="/contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
          <Link href="/webhooks/new" className="transition-colors hover:text-foreground">
            Webhooks
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-sky-500 to-violet-600 text-white shadow-md shadow-violet-500/20 hover:shadow-violet-500/30"
            asChild
          >
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
