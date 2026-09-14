import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ClipboardCheck, GraduationCap, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_META, SCHOOL_PROFILE } from "@/config/app.config";
import schoolImage from "@/assets/greenhill-school.jpg";

const FEATURES = [
  { icon: GraduationCap, title: "Learner records", body: "GES identifiers, admission details, guardians and fee balances for every learner from KG1 to Basic 9." },
  { icon: ClipboardCheck, title: "Termly assessment", body: "Capture marks per subject, rank learners and publish report cards aligned to Ghana's standards-based curriculum." },
  { icon: Wallet, title: "Fees in Ghana cedis", body: "Track billing, Mobile Money and bank collections, and outstanding balances across every academic term." },
  { icon: ShieldCheck, title: "Locked terms", body: "Closing a term makes its marks a published record, protected beyond the screen." },
];

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "EduMaster · School Management for Ghanaian Basic Schools" },
    { name: "description", content: "EduMaster manages learners, examinations, report cards, attendance and fees in Ghana cedis for basic schools from KG1 to Basic 9." },
    { property: "og:title", content: "EduMaster · School Management for Ghanaian Basic Schools" },
    { property: "og:description", content: "Learner records, marks entry, ranking, report cards and fee tracking in one secure system." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-paper">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-foreground/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-brand-deep text-primary-foreground"><GraduationCap className="size-5" aria-hidden /></span>
            <div className="leading-none"><p className="text-base font-semibold uppercase">{APP_META.name}</p><p className="mt-1 text-xs text-muted-foreground">{SCHOOL_PROFILE.name}</p></div>
          </div>
          <Button asChild size="sm" variant="outline" className="bg-brand-paper/90 shadow-none"><Link to="/auth">Sign in <ArrowRight aria-hidden /></Link></Button>
        </div>
      </header>
      <main>
        <section className="relative min-h-[88vh] overflow-hidden border-b border-foreground/10 pt-24">
          <img src={schoolImage} alt="Learners walking through a bright Ghanaian school courtyard" width={1600} height={1100} className="absolute inset-0 size-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-paper via-brand-paper/95 to-brand-paper/5" />
          <div className="relative mx-auto flex min-h-[calc(88vh-6rem)] max-w-7xl items-center px-5 py-16 sm:px-8">
            <div className="max-w-xl">
              <p className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase text-primary"><span className="h-px w-10 bg-primary" /> Ghana · KG1 to Basic 9</p>
              <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl lg:text-8xl">{APP_META.name}</h1>
              <p className="mt-5 font-display text-3xl italic text-primary sm:text-4xl">School, thoughtfully managed.</p>
              <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">One clear place for learner records, examinations, report cards, attendance and fees at {SCHOOL_PROFILE.name}.</p>
              <div className="mt-9 flex flex-wrap items-center gap-4"><Button asChild size="lg" className="h-12 px-6 shadow-none"><Link to="/auth">Enter your school <ArrowRight aria-hidden /></Link></Button><p className="text-sm text-muted-foreground">Secure access for school staff</p></div>
            </div>
          </div>
          <div className="absolute bottom-5 right-5 hidden border-l border-primary-foreground/40 pl-4 text-primary-foreground sm:block"><p className="text-xs uppercase">{SCHOOL_PROFILE.name}</p><p className="mt-1 font-display text-xl italic">{SCHOOL_PROFILE.motto}</p></div>
        </section>
        <section className="bg-brand-deep text-primary-foreground">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_2.2fr] lg:py-24">
            <div><BookOpen className="size-6 text-brand-mint" aria-hidden /><h2 className="mt-5 font-display text-4xl leading-tight">The daily work,<br /><span className="italic text-brand-mint">made clearer.</span></h2></div>
            <div className="grid border-t border-primary-foreground/20 sm:grid-cols-2">
              {FEATURES.map((feature) => <article key={feature.title} className="border-b border-primary-foreground/20 py-7 sm:px-7 sm:odd:border-r"><span className="flex size-9 items-center justify-center rounded-md bg-brand-mint text-brand-deep"><feature.icon className="size-5" aria-hidden /></span><h3 className="mt-5 text-base font-semibold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-primary-foreground/70">{feature.body}</p></article>)}
            </div>
          </div>
        </section>
      </main>
      <footer><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8"><p className="font-semibold text-foreground">{APP_META.name} · {SCHOOL_PROFILE.name}</p><p>{SCHOOL_PROFILE.town}, {SCHOOL_PROFILE.region}</p></div></footer>
    </div>
  );
}
