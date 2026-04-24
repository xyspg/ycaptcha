"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth/session";
import { ONBOARDING_DISMISSED_COOKIE } from "./onboarding-progress";

export async function dismissOnboarding(): Promise<void> {
  await requireSession();

  const store = await cookies();
  store.set(ONBOARDING_DISMISSED_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/dashboard", "layout");
}
