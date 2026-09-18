import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "@/components/AuthShell";


export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password · EduMaster" },
      {
        name: "description",
        content: "Set a new password for your EduMaster school management account.",
      },
      { property: "og:title", content: "Choose a new password · EduMaster" },
      {
        property: "og:description",
        content: "Complete your EduMaster password recovery and set a new password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "The two passwords do not match.",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase delivers the recovery session through the URL fragment and emits
  // PASSWORD_RECOVERY once it has been exchanged.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setRecovering(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecovering(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the passwords you entered.");
      return;
    }
    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    toast.success("Password updated — you're signed in.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <AuthShell>
      <p className="mb-3 text-xs font-medium uppercase text-primary">Account recovery</p>
      <h1 className="font-display text-4xl sm:text-5xl">A new password.</h1>
      <p className="mb-8 mt-4 text-sm leading-6 text-muted-foreground">Choose a password you don’t use anywhere else.</p>
            {!ready ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-primary" aria-label="Loading" />
              </div>
            ) : !recovering ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>
                    This recovery link is invalid or has expired. Request a new one from the sign-in
                    page.
                  </AlertDescription>
                </Alert>
                <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    maxLength={72}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    minLength={8}
                    maxLength={72}
                    required
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                  Update password
                </Button>
              </form>
            )}
    </AuthShell>
  );
}
