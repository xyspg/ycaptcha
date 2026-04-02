import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { puzzle, site } from "@/lib/db/app-schema";
import { SiteDetail } from "./site-detail";

export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const [session, { id }] = await Promise.all([requireSession(), params]);

	const [siteData] = await db
		.select()
		.from(site)
		.where(and(eq(site.id, id), eq(site.userId, session.user.id)));

	if (!siteData) notFound();

	const puzzles = await db
		.select()
		.from(puzzle)
		.where(eq(puzzle.siteId, siteData.id));

	return <SiteDetail site={siteData} puzzles={puzzles} />;
}
