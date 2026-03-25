import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
	consumeVerifiedSession,
	getVerifiedSession,
} from "@/lib/captcha-session";
import { db } from "@/lib/db";
import { puzzle, site } from "@/lib/db/app-schema";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";

export async function POST(request: Request) {
	const limited = await checkRateLimit(rateLimiters.siteverify, request);
	if (limited) return limited;

	const body = await request.json().catch(() => null);
	if (!body?.token || !body?.secretKey) {
		return NextResponse.json(
			{ success: false, error: "Missing token or secretKey" },
			{ status: 400 },
		);
	}

	const { token, secretKey } = body as { token: string; secretKey: string };

	// read session without consuming — validate secretKey first
	const session = await getVerifiedSession(token);

	if (!session) {
		return NextResponse.json({ success: false });
	}

	// proves secretKey owns the puzzle's site
	const [owner] = await db
		.select({ siteId: site.id })
		.from(puzzle)
		.innerJoin(
			site,
			and(eq(site.id, puzzle.siteId), eq(site.secretKey, secretKey)),
		)
		.where(eq(puzzle.id, session.puzzleId));

	if (!owner) {
		return NextResponse.json({ success: false });
	}

	// consume only after successful validation
	await consumeVerifiedSession(token);

	return NextResponse.json({ success: true });
}
