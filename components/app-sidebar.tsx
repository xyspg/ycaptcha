"use client";

import {
  BookOpen,
  Globe,
  Home,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { OnboardingProgress } from "@/app/(main)/dashboard/onboarding-progress";
import { SidebarOnboardingChecklist } from "@/components/sidebar-onboarding";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";

export function AppSidebar({
  onboarding,
}: {
  onboarding?: OnboardingProgress | null;
}) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const { data: session, isPending } = authClient.useSession();
  const { setOpenMobile } = useSidebar();
  const closeOnMobile = () => setOpenMobile(false);

  const navItems = [
    { title: t("overview"), href: "/dashboard", icon: LayoutDashboard },
    { title: t("sites"), href: "/dashboard/sites", icon: Globe },
    { title: t("puzzles"), href: "/dashboard/puzzles", icon: KeyRound },
    { title: t("imageSets"), href: "/dashboard/image-sets", icon: Images },
    { title: t("audio"), href: "/dashboard/audio", icon: Volume2 },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/dashboard"
          onClick={closeOnMobile}
          className="flex justify-center py-1"
        >
          <Image
            src="/ycaptcha.webp"
            alt="yCAPTCHA"
            width={160}
            height={48}
            style={{ width: "auto", height: "auto" }}
            priority
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("manage")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} onClick={closeOnMobile}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {onboarding && <SidebarOnboardingChecklist progress={onboarding} />}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/home" onClick={closeOnMobile}>
                <Home />
                <span>{t("homePage")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/gallery" target="_blank">
                <Sparkles />
                <span>{t("gallery")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/docs" target="_blank">
                <BookOpen />
                <span>{t("docs")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith("/dashboard/settings")}
            >
              <Link href="/dashboard/settings" onClick={closeOnMobile}>
                <Settings />
                <span>{t("settings")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-1.5">
              {isPending ? (
                <>
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </>
              ) : (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {session?.user.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium">
                      {session?.user.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {session?.user.email}
                    </span>
                  </div>
                  <SignOutButton />
                </>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function SignOutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <button
      type="button"
      disabled={signingOut}
      onClick={() => {
        setSigningOut(true);
        authClient.signOut({
          fetchOptions: {
            onSuccess: () => router.push("/login"),
          },
        });
      }}
      className="text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
