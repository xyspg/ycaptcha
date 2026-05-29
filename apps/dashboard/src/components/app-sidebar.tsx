import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Globe,
  Home,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Settings,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import {
  type OnboardingProgress,
  SidebarOnboardingChecklist,
} from "@/components/sidebar-onboarding";
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
import { api, unwrap } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

type OnboardingResponse = {
  dismissed: boolean;
  progress: OnboardingProgress | null;
};

// Home and Docs live on the landing site, a different origin from the dashboard
// SPA, so they must be absolute URLs (a root-relative href would hit this app).
const LANDING_URL = (
  import.meta.env.VITE_LANDING_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

function isPathActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const { setOpenMobile } = useSidebar();
  const closeOnMobile = () => setOpenMobile(false);

  const onboarding = useQuery({
    queryKey: ["onboarding"],
    queryFn: () => unwrap<OnboardingResponse>(api.api.v1.onboarding.$get()),
    enabled: !!session,
    staleTime: 60_000,
  });

  const navItems: { title: React.ReactNode; href: string; Icon: LucideIcon }[] =
    [
      {
        title: <Trans>Overview</Trans>,
        href: "/dashboard",
        Icon: LayoutDashboard,
      },
      { title: <Trans>Sites</Trans>, href: "/dashboard/sites", Icon: Globe },
      {
        title: <Trans>Puzzles</Trans>,
        href: "/dashboard/puzzles",
        Icon: KeyRound,
      },
      {
        title: <Trans>Image sets</Trans>,
        href: "/dashboard/image-sets",
        Icon: Images,
      },
      { title: <Trans>Audio</Trans>, href: "/dashboard/audio", Icon: Volume2 },
    ];

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          to="/dashboard"
          onClick={closeOnMobile}
          className="flex justify-center py-1"
        >
          <span className="font-semibold tracking-tight">yCAPTCHA</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Trans>Manage</Trans>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isPathActive(pathname, item.href)}
                  >
                    <Link to={item.href} onClick={closeOnMobile}>
                      <item.Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {onboarding.data &&
          !onboarding.data.dismissed &&
          onboarding.data.progress && (
            <SidebarOnboardingChecklist progress={onboarding.data.progress} />
          )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href={LANDING_URL} target="_self">
                <Home />
                <span>
                  <Trans>Home</Trans>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href={`${LANDING_URL}/docs`} target="_blank" rel="noreferrer">
                <BookOpen />
                <span>
                  <Trans>Docs</Trans>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isPathActive(pathname, "/dashboard/settings")}
            >
              <Link to="/dashboard/settings" onClick={closeOnMobile}>
                <Settings />
                <span>
                  <Trans>Settings</Trans>
                </span>
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
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <button
      type="button"
      disabled={signingOut}
      onClick={async () => {
        setSigningOut(true);
        try {
          await authClient.signOut();
          navigate({ to: "/login" });
        } finally {
          setSigningOut(false);
        }
      }}
      className="text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
