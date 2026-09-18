import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/AuthShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APP_META, SCHOOL_PROFILE } from "@/config/app.config";
import { credentialsSchema, signUpSchema } from "@/lib/validation/schemas";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · EduMaster School Management" },
      {
        name: "description",
        content:
          "Secure staff sign-in for EduMaster — manage learners, examinations, marks and fees for your school.",
      },
      { property: "og:title", content: "Sign in · EduMaster School Management" },
      {
        property: "og:description",
        content: "Secure staff sign-in for the EduMaster school management system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

/** Only same-origin relative paths are ever used as a post-login destination. */
function safeRedirect(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const destination = safeRedirect(search.redirect);
  const [checking, setChecking] = useState(true);
  const [forgot, setForgot] = useState(false);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: destination, replace: true });
      else setChecking(false);
    });
  }, [navigate, destination]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="size-6 animate-spin text-primary" aria-label="Checking your session" />
      </main>
    );
  }

  return (
    <AuthShell>
      {forgot ? (
        <>
          <p className="mb-3 text-xs font-medium uppercase text-primary">Account recovery</p>
          <h1 className="font-display text-4xl sm:text-5xl">A fresh start.</h1>
          <p className="mb-8 mt-4 text-sm leading-6 text-muted-foreground">We’ll email you a link to choose a new password.</p>
          <ForgotPasswordForm onBack={() => setForgot(false)} />
        </>
      ) : (
        <Tabs defaultValue="signin">
          <TabsList className="mb-9 grid h-11 w-full grid-cols-2 rounded-md bg-brand-mint p-1">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-0">
            <p className="mb-3 text-xs font-medium uppercase text-primary">Your school, connected</p>
            <h1 className="font-display text-4xl sm:text-5xl">Welcome back.</h1>
            <p className="mb-8 mt-4 text-sm leading-6 text-muted-foreground">Sign in to {SCHOOL_PROFILE.name}.</p>
            <CredentialsForm mode="signin" destination={destination} />
            <Button type="button" variant="link" onClick={() => setForgot(true)} className="mt-3 h-10 w-full text-sm">Forgot your password?</Button>
          </TabsContent>
          <TabsContent value="signup" className="mt-0">
            <p className="mb-3 text-xs font-medium uppercase text-primary">Join your school</p>
            <h1 className="font-display text-4xl sm:text-5xl">Start here.</h1>
            <p className="mb-8 mt-4 text-sm leading-6 text-muted-foreground">Create your {APP_META.name} account.</p>
            <CredentialsForm mode="signup" destination={destination} />
            <p className="mt-5 text-xs leading-5 text-muted-foreground">Your school administrator manages account access and roles.</p>
          </TabsContent>
        </Tabs>
      )}
    </AuthShell>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = z.string().email().safeParse(email.trim());
    if (!parsed.success) {
      setError("Enter the email address on your account.");
      return;
    }
    setPending(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            If an account exists for {email.trim()}, a reset link is on its way. Check your inbox
            and spam folder.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="forgot-email">Work email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu.gh"
          required
          maxLength={255}
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
        Send reset link
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        Back to sign in
      </Button>
    </form>
  );
}


function CredentialsForm({
  mode,
  destination,
}: {
  mode: "signin" | "signup";
  destination: string;
}) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignUp = mode === "signup";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const parsed = isSignUp
      ? signUpSchema.safeParse({ fullName, email, password })
      : credentialsSchema.safeParse({ email, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the details you entered.");
      return;
    }

    setPending(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          toast.success("Account created — welcome to EduMaster");
          navigate({ to: destination, replace: true });
        } else {
          setNotice("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        toast.success("Signed in");
        navigate({ to: destination, replace: true });
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Something went wrong.";
      setError(
        message.toLowerCase().includes("invalid login")
          ? "That email and password combination doesn't match an account."
          : message,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {isSignUp && (
        <div className="space-y-1.5">
          <Label htmlFor={`${mode}-name`}>Full name</Label>
          <Input
            id={`${mode}-name`}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            required
            maxLength={120}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-email`}>Work email</Label>
        <Input
          id={`${mode}-email`}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu.gh"
          required
          maxLength={255}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-password`}>Password</Label>
        <Input
          id={`${mode}-password`}
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={72}
        />
        {isSignUp && (
          <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
        {isSignUp ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
