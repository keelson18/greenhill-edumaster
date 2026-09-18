import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_META, SCHOOL_PROFILE } from "@/config/app.config";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-paper text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="EduMaster home">
            <span className="flex size-9 items-center justify-center rounded-md bg-brand-deep text-primary-foreground"><GraduationCap className="size-5" aria-hidden /></span>
            <span className="text-sm font-semibold uppercase">{APP_META.name}</span>
          </Link>
          <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft aria-hidden /> Back to home</Link></Button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-sm [&_input]:h-12 [&_input]:bg-background [&_input]:shadow-none [&_button[type=submit]]:h-12 [&_button[type=submit]]:shadow-none">{children}</div>
      </main>
      <footer className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-2 border-t border-border px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:px-8">
        <p>{SCHOOL_PROFILE.name}</p>
        <p>{SCHOOL_PROFILE.town}, {SCHOOL_PROFILE.region}</p>
      </footer>
    </div>
  );
}