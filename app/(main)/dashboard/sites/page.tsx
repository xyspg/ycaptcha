import { eq } from "drizzle-orm";
import { SiteSettings } from "@/app/(main)/dashboard/sites/site-settings";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { site } from "@/lib/db/app-schema";

export default async function Page() {
	const session = await requireSession();

	const sites = await db
		.select()
		.from(site)
		.where(eq(site.userId, session.user.id));

	return <SiteSettings sites={sites} />;
}
