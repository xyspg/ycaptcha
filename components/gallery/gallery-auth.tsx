"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";

// The gallery browse page is static, so everything that depends on who is
// signed in renders client-side.

export function GalleryMineLink() {
  const t = useTranslations("gallery");
  const { data: session } = authClient.useSession();
  if (!session) return null;
  return (
    <Button asChild variant="ghost" size="sm">
      <Link href="/gallery/mine">{t("navMine")}</Link>
    </Button>
  );
}

export function GalleryAccountButton() {
  const t = useTranslations("gallery");
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <Skeleton className="ml-1 h-7 w-20 rounded-full" />;
  return (
    <Button asChild size="sm" className="ml-1 rounded-full px-3">
      {session ? (
        <Link href="/dashboard">{t("navDashboard")}</Link>
      ) : (
        <Link href="/login">{t("navSignIn")}</Link>
      )}
    </Button>
  );
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
