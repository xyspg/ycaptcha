"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";

// Session-dependent gallery links. Pages that know the session on the server
// render the plain variants; the static browse page uses the Gallery* ones,
// which resolve it on the client.

export function MineLink() {
  const t = useTranslations("gallery");
  return (
    <Button asChild variant="ghost" size="sm">
      <Link href="/gallery/mine">{t("navMine")}</Link>
    </Button>
  );
}

export function AccountButton({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("gallery");
  return (
    <Button asChild size="sm" className="ml-1 rounded-full px-3">
      {signedIn ? (
        <Link href="/dashboard">{t("navDashboard")}</Link>
      ) : (
        <Link href="/login">{t("navSignIn")}</Link>
      )}
    </Button>
  );
}

export function GalleryMineLink() {
  const { data: session } = authClient.useSession();
  return session ? <MineLink /> : null;
}

export function GalleryAccountButton() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <Skeleton className="ml-1 h-7 w-20 rounded-full" />;
  return <AccountButton signedIn={!!session} />;
}

export function GalleryPublishButton() {
  const t = useTranslations("gallery");
  const { data: session } = authClient.useSession();
  if (!session) return null;
  return (
    <Button asChild variant="outline" size="sm" className="rounded-full">
      <Link href="/dashboard/image-sets">{t("publishOneOfYours")}</Link>
    </Button>
  );
}
