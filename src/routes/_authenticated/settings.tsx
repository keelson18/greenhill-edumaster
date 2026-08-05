import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, KeyRound, UserRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS } from "@/config/app.config";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "My settings · EduMaster" },
      {
        name: "description",
        content: "Update your EduMaster profile details and change your account password.",
      },
      { property: "og:title", content: "My settings · EduMaster" },
      {
        property: "og:description",
        content: "Manage your EduMaster profile and password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "The two passwords do not match.",
    path: ["confirm"],
  });

function SettingsPage() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName ?? "");
    setPhone(user.phone ?? "");
  }, [user]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    if (fullName.trim().length < 2) {
      toast.error("Enter your full name.");
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", session.user.id);
    setSavingProfile(false);
    if (error) {
      toast.error(`Could not save your details: ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["session-user"] });
    toast.success("Your details were saved.");
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    const parsed = passwordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the passwords you entered.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      toast.error(`Could not change your password: ${error.message}`);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Your password was changed.");
  }

  return (
    <AppLayout title="My settings" subtitle="Your profile details and account security.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4" aria-hidden /> Profile
            </CardTitle>
            <CardDescription>
              Signed in as {user?.email ?? "—"}
              {user?.roles.length ? (
                <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                  {user.roles.map((role) => (
                    <Badge key={role} variant="secondary" className="rounded-full text-[10px]">
                      {ROLE_LABELS[role]}
                    </Badge>
                  ))}
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="settings-name">Full name</Label>
                <Input
                  id="settings-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={120}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-phone">Phone</Label>
                <Input
                  id="settings-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 512 3390"
                  maxLength={24}
                  autoComplete="tel"
                />
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                Save details
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" aria-hidden /> Change password
            </CardTitle>
            <CardDescription>Use at least 8 characters you don&apos;t use elsewhere.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePassword} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="settings-password">New password</Label>
                <Input
                  id="settings-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-confirm">Confirm new password</Label>
                <Input
                  id="settings-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                />
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
