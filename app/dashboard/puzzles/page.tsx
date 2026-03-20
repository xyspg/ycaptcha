import { eq } from "drizzle-orm";
import Link from "next/link";
import { KeyRound, Plus } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { site, puzzle } from "@/lib/db/app-schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function Page() {
  const session = await requireSession();

  const userSites = await db
    .select()
    .from(site)
    .where(eq(site.userId, session.user.id));

  const siteIds = userSites.map((s) => s.id);

  const puzzles =
    siteIds.length > 0
      ? await db.query.puzzle.findMany({
          where: (p, { inArray }) => inArray(p.siteId, siteIds),
          with: { site: true, imageSet: true },
          orderBy: (p, { desc }) => desc(p.createdAt),
        })
      : [];

  const hasPrereqs = userSites.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Puzzles</h1>
        {hasPrereqs && (
          <Button asChild>
            <Link href="/dashboard/puzzles/new">
              <Plus className="size-4" /> Create Puzzle
            </Link>
          </Button>
        )}
      </div>

      {puzzles.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <KeyRound className="size-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No puzzles yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {!hasPrereqs ? (
              <>
                <Link
                  href="/dashboard/sites"
                  className="underline hover:text-foreground"
                >
                  Create a site
                </Link>
                {" first, then add puzzles to it."}
              </>
            ) : (
              "Create a puzzle to start using yCAPTCHA."
            )}
          </p>
          {hasPrereqs && (
            <div className="mt-6">
              <Button asChild>
                <Link href="/dashboard/puzzles/new">
                  <Plus className="size-4" /> Create Puzzle
                </Link>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {puzzles.map((p) => (
            <Link key={p.id} href={`/dashboard/puzzles/${p.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{p.prompt}</CardTitle>
                <CardDescription>
                  {p.site.name} &middot; difficulty {p.difficulty}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Image set: {p.imageSet.name}</span>
                  <span>&middot;</span>
                  <span>
                    {(p.correctImageIds as string[]).length} correct image
                    {(p.correctImageIds as string[]).length === 1 ? "" : "s"}
                  </span>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
