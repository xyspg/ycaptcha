import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { galleryItem } from "@/lib/db/app-schema";
import { GalleryItemCard } from "./gallery-item-card";

export const dynamic = "force-dynamic";

export default async function GalleryBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort === "popular" ? "popular" : "recent";
  const tag = typeof params.tag === "string" ? params.tag : null;

  const [session, items] = await Promise.all([
    getSession(),
    db
      .select()
      .from(galleryItem)
      .where(eq(galleryItem.status, "published"))
      .orderBy(
        sort === "popular"
          ? desc(galleryItem.downloadCount)
          : desc(galleryItem.createdAt),
      )
      .limit(60),
  ]);

  // tag filter applied in memory — jsonb ? operator via drizzle needs a raw
  // expression and the result set is small for now
  const filtered = tag ? items.filter((it) => it.tags.includes(tag)) : items;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
      {/* Hero */}
      <section className="mb-10 flex flex-col gap-4 lg:mb-14">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
          <span className="inline-block size-1.5 rounded-full bg-amber-500" />
          Gallery
        </div>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-balance lg:text-[52px]">
          Image sets, <br className="hidden sm:block" />
          <em className="italic text-amber-600 dark:text-amber-400">
            from the community.
          </em>
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg">
          Fork a shared image set into your account, then wire up your own
          prompt and correct images on top.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {session && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Link href="/dashboard/image-sets">Publish one of yours</Link>
            </Button>
          )}
          <SortTabs sort={sort} tag={tag} />
        </div>
      </section>

      {/* Tag filter banner */}
      {tag && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm">
          <span className="text-muted-foreground">Filter:</span>
          <span className="font-medium">#{tag}</span>
          <Link
            href={`/gallery${sort === "popular" ? "?sort=popular" : ""}`}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear filter"
          >
            ×
          </Link>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState hasTag={!!tag} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <GalleryItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function SortTabs({ sort, tag }: { sort: string; tag: string | null }) {
  const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : "";
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-background/70 p-0.5 text-sm">
      <Link
        href={`/gallery${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`}
        className={`rounded-full px-3 py-1 transition-colors ${sort === "recent" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
      >
        Recent
      </Link>
      <Link
        href={`/gallery?sort=popular${tagParam}`}
        className={`rounded-full px-3 py-1 transition-colors ${sort === "popular" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
      >
        Popular
      </Link>
    </div>
  );
}

function EmptyState({ hasTag }: { hasTag: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-background/50 px-8 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </div>
      <div className="max-w-sm">
        <div className="font-heading text-lg font-semibold">
          {hasTag ? "Nothing under that tag yet" : "Gallery's just opening"}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasTag
            ? "Try another tag, or clear the filter to see everything."
            : "No items published yet. Be the first — publish from one of your image sets."}
        </p>
      </div>
    </div>
  );
}
