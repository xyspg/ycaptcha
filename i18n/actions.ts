"use server";

import { cookies } from "next/headers";
import { defaultLocale, type Locale, locales } from "./config";

export async function setLocale(locale: string) {
	if (!locales.includes(locale as Locale)) return;
	const store = await cookies();
	store.set("locale", locale, {
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
		sameSite: "lax",
	});
}

export async function getLocale(): Promise<Locale> {
	const store = await cookies();
	const raw = store.get("locale")?.value;
	return locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;
}
