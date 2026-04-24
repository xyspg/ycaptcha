import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth/session";
import {
  getOnboardingProgress,
  ONBOARDING_DISMISSED_COOKIE,
  type OnboardingProgress,
} from "./onboarding-progress";

async function loadOnboarding(): Promise<OnboardingProgress | null> {
  const store = await cookies();
  if (store.get(ONBOARDING_DISMISSED_COOKIE)?.value === "1") return null;

  const session = await getSession();
  if (!session) return null;

  return getOnboardingProgress(session.user.id);
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const onboarding = await loadOnboarding();

  return (
    <SidebarProvider>
      <AppSidebar onboarding={onboarding} />
      <main className="flex-1 min-w-0 bg-background [--card:var(--background)]">
        <div className="sticky top-0 z-10 flex items-center border-b bg-background p-2 md:hidden">
          <SidebarTrigger />
        </div>
        <div className="mx-auto w-full max-w-7xl p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
