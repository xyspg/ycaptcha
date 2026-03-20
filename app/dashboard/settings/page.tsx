"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ProfileSection() {
  const { data: session, isPending } = authClient.useSession();
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const name = nameOverride ?? session?.user.name ?? "";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setMessage(null);

    const { error } = await authClient.updateUser({ name: name.trim() });

    setSaving(false);
    if (error) {
      setMessage(error.message ?? "Failed to update");
    } else {
      setMessage("Name updated");
    }
  };

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your display name.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={session?.user.email ?? ""}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setNameOverride(e.target.value);
                setMessage(null);
              }}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {message && (
              <p className="text-xs text-muted-foreground">{message}</p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const DELETE_CONFIRMATION_PHRASE = "delete my account";

function DeleteAccountSection() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [emailInput, setEmailInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userEmail = session?.user.email ?? "";

  const resetAll = () => {
    setStep(1);
    setEmailInput("");
    setPhraseInput("");
    setPassword("");
    setError(null);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    setError(null);

    const { error: err } = await authClient.deleteUser({
      ...(password ? { password } : {}),
      callbackURL: "/login",
    });

    setDeleting(false);
    if (err) {
      setError(err.message ?? "Failed to delete account");
    } else {
      router.push("/login");
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Delete Account</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data including
          sites, puzzles, image sets, and uploaded images.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step 1: Initial button */}
        {step === 1 && (
          <Button variant="destructive" size="sm" onClick={() => setStep(2)}>
            Delete Account
          </Button>
        )}

        {/* Step 2: Warning */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-destructive bg-destructive/10 p-4">
              <p className="text-sm font-semibold text-destructive">
                Are you sure you want to do this?
              </p>
              <p className="mt-2 text-xs text-destructive/80">
                This action is <strong>permanent and irreversible</strong>. All
                your sites, puzzles, image sets, and uploaded images will be
                permanently destroyed. Active CAPTCHA widgets on your sites will
                stop working immediately.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setStep(3)}
              >
                I understand, continue
              </Button>
              <Button variant="ghost" size="sm" onClick={resetAll}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Type email + confirmation phrase */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-destructive bg-destructive/10 p-4">
              <p className="text-xs text-destructive/80">
                To verify, type your email{" "}
                <span className="font-mono font-bold text-destructive">
                  {userEmail}
                </span>{" "}
                and the phrase{" "}
                <span className="font-mono font-bold text-destructive">
                  {DELETE_CONFIRMATION_PHRASE}
                </span>{" "}
                below.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-email" className="text-xs">
                Your email
              </Label>
              <Input
                id="confirm-email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={userEmail}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-phrase" className="text-xs">
                Type &quot;{DELETE_CONFIRMATION_PHRASE}&quot;
              </Label>
              <Input
                id="confirm-phrase"
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                placeholder={DELETE_CONFIRMATION_PHRASE}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={
                  emailInput.toLowerCase() !== userEmail ||
                  phraseInput.toLowerCase() !== DELETE_CONFIRMATION_PHRASE
                }
                onClick={() => setStep(4)}
              >
                Continue
              </Button>
              <Button variant="ghost" size="sm" onClick={resetAll}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Final confirmation with password */}
        {step === 4 && (
          <form onSubmit={handleDelete} className="flex flex-col gap-4">
            <div className="rounded-md border-2 border-destructive bg-destructive/15 p-4">
              <p className="text-center text-lg font-bold text-destructive">
                FINAL WARNING
              </p>
              <p className="mt-2 text-center text-sm text-destructive">
                This is your last chance. After this, there is no going back.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="delete-password" className="text-xs">
                Enter your password to permanently delete your account
              </Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={deleting}
                className="bg-red-700 hover:bg-red-800"
              >
                {deleting
                  ? "Deleting everything..."
                  : "Permanently delete my account"}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetAll}>
                Cancel
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="flex flex-col gap-6 max-w-lg">
        <ProfileSection />
        <DeleteAccountSection />
      </div>
    </div>
  );
}
