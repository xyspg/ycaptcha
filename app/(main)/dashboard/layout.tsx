import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/auth/session";
import {
  getOnboardingProgress,
  ONBOARDING_DISMISSED_COOKIE,
  type OnboardingProgress,
} from "./onboarding-progress";

async function loadOnboarding(
  userId: string,
): Promise<OnboardingProgress | null> {
  const store = await cookies();
  if (store.get(ONBOARDING_DISMISSED_COOKIE)?.value === "1") return null;

  return getOnboardingProgress(userId);
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy only checks that a session cookie exists. Validating here,
  // outside the loading.tsx boundary, turns a stale cookie into a real 307
  // before streaming starts.
  const session = await requireSession();
  const onboarding = await loadOnboarding(session.user.id);

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
