import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GraduationCap,
  ClipboardCheck,
  Wallet,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_META, SCHOOL_PROFILE } from "@/config/app.config";

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Learner records",
    body: "GES identifiers, admission details, guardians and fee balances for every learner from KG1 to Basic 9.",
  },
  {
    icon: ClipboardCheck,
    title: "Termly assessment",
    body: "Capture marks per subject, rank learners and publish termly report cards aligned to the Ghanaian standards-based curriculum.",
  },
  {
    icon: Wallet,
    title: "Fees in Ghana cedis",
    body: "Track billing, Mobile Money and bank collections, and outstanding balances across every academic term.",
  },
  {
    icon: ShieldCheck,
    title: "Locked terms",
    body: "Closing a term makes its marks a published record — enforced in the database, not just the screen.",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduMaster · School Management for Ghanaian Basic Schools" },
      {
        name: "description",
        content:
          "EduMaster manages learners, examinations, report cards, attendance and fees in Ghana cedis for basic schools from KG1 to Basic 9.",
      },
      {
        property: "og:title",
        content: "EduMaster · School Management for Ghanaian Basic Schools",
      },
      {
        property: "og:description",
        content:
          "Learner records, marks entry, ranking, report cards and fee tracking in one secure system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">{APP_META.name}</p>
              <p className="text-xs text-muted-foreground">{SCHOOL_PROFILE.name}</p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Staff sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <BarChart3 className="size-3.5" aria-hidden /> Built for the Kenyan CBC curriculum
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Run your whole school from one place
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {APP_META.name} brings learner records, CBC examinations, report cards, attendance and
              fees in {SCHOOL_PROFILE.currency} into a single secure system for {SCHOOL_PROFILE.name}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Sign in to your school <ArrowRight className="ml-1.5 size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <p className="font-medium text-foreground">{SCHOOL_PROFILE.name}</p>
          <p>{SCHOOL_PROFILE.motto}</p>
        </div>
      </footer>
    </div>
  );
}
