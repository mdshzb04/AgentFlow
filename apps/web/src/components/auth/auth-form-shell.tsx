import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthFormShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthFormShell({ title, description, children, footer }: AuthFormShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo size="md" href="/" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
        {footer && (
          <div className="border-t px-6 pb-6 pt-2 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}

export function AuthFooterLinks() {
  return (
  <>
    <Link href="/" className="underline-offset-4 hover:underline">
      Back to home
    </Link>
    {" · "}
    <Link href="/contact" className="underline-offset-4 hover:underline">
      Contact support
    </Link>
  </>
  );
}
