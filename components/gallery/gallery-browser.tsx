"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GALLERY_PAGE_SIZE, type GalleryCardItem } from "./card-item";
import { GalleryPublishButton } from "./gallery-auth";
import { GalleryItemCard } from "./gallery-item-card";
import { SearchLink } from "./search-link";

type Sort = "recent" | "popular";

// Reads ?sort= and ?tag= on the client: the page is prerendered, so search
// params never reach the server. Render inside <Suspense> with a
// <GalleryListing> fallback so the default view is in the static HTML.
export function GalleryBrowser({ items }: { items: GalleryCardItem[] }) {
  const params = useSearchParams();
  const sort = params.get("sort") === "popular" ? "popular" : "recent";
  return <GalleryListing items={items} sort={sort} tag={params.get("tag")} />;
}

export function GalleryListing({
  items,
  sort,
  tag,
}: {
  // Union of the first page for each sort order; see the browse page.
  items: GalleryCardItem[];
  sort: Sort;
  tag: string | null;
}) {
  const t = useTranslations("gallery");

  const listed = [...items]
    .sort(
      sort === "popular"
        ? (a, b) =>
            b.downloadCount - a.downloadCount || b.createdAt - a.createdAt
        : (a, b) => b.createdAt - a.createdAt,
    )
    .slice(0, GALLERY_PAGE_SIZE);
  // tag filter applied in memory, after the page limit, as before
  const filtered = tag ? listed.filter((it) => it.tags.includes(tag)) : listed;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
      {/* Hero */}
      <section className="mb-10 flex flex-col gap-4 lg:mb-14">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
          <span className="inline-block size-1.5 rounded-full bg-amber-500" />
          {t("browseEyebrow")}
        </div>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-balance lg:text-[52px]">
          {t("browseHeadlineA")} <br className="hidden sm:block" />
          <em className="italic text-amber-600 dark:text-amber-400">
            {t("browseHeadlineB")}
          </em>
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg">
          {t("browseTagline")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <GalleryPublishButton />
          <SortTabs
            sort={sort}
            tag={tag}
            labels={{ recent: t("sortRecent"), popular: t("sortPopular") }}
          />
        </div>
      </section>

      {/* Tag filter banner */}
      {tag && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm">
          <span className="text-muted-foreground">{t("filterLabel")}</span>
          <span className="font-medium">#{tag}</span>
          <SearchLink
            search={sort === "popular" ? "?sort=popular" : ""}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("clearFilter")}
          >
            ×
          </SearchLink>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          headline={tag ? t("emptyTagHeadline") : t("emptyHeadline")}
          body={tag ? t("emptyTagBody") : t("emptyBody")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <GalleryItemCard key={item.slug} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function SortTabs({
  sort,
  tag,
  labels,
}: {
  sort: Sort;
  tag: string | null;
  labels: { recent: string; popular: string };
}) {
  const tagParam = tag ? `tag=${encodeURIComponent(tag)}` : "";
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-background/70 p-0.5 text-sm">
      <SearchLink
        search={tagParam ? `?${tagParam}` : ""}
        className={`rounded-full px-3 py-1 transition-colors ${sort === "recent" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
      >
        {labels.recent}
      </SearchLink>
      <SearchLink
        search={`?sort=popular${tagParam ? `&${tagParam}` : ""}`}
        className={`rounded-full px-3 py-1 transition-colors ${sort === "popular" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
      >
        {labels.popular}
      </SearchLink>
    </div>
  );
}

function EmptyState({ headline, body }: { headline: string; body: string }) {
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
        <div className="font-heading text-lg font-semibold">{headline}</div>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
