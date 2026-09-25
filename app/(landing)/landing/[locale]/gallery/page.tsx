import { desc, eq, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import {
  GALLERY_PAGE_SIZE,
  toGalleryCardItem,
} from "@/components/gallery/card-item";
import {
  GalleryBrowser,
  GalleryListing,
} from "@/components/gallery/gallery-browser";
import { db } from "@/lib/db";
import { galleryItem } from "@/lib/db/app-schema";

// Prerendered per locale; next.config.ts rewrites /gallery here like it does
// `/` for the landing page. Regenerated hourly, and on publish, delete and
// fork (see app/(main)/(gallery)/actions.ts).
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/gallery" },
};

function listPublished(...orderBy: SQL[]) {
  return db
    .select({
      id: galleryItem.id,
      slug: galleryItem.slug,
      title: galleryItem.title,
      description: galleryItem.description,
      anonymous: galleryItem.anonymous,
      authorDisplayName: galleryItem.authorDisplayName,
      tags: galleryItem.tags,
      images: galleryItem.images,
      downloadCount: galleryItem.downloadCount,
      createdAt: galleryItem.createdAt,
    })
    .from(galleryItem)
    .where(eq(galleryItem.status, "published"))
    .orderBy(...orderBy)
    .limit(GALLERY_PAGE_SIZE);
}

export default async function GalleryBrowsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Sorting and tag filtering run client-side, so ship the union of the
  // first page for each sort order; either sort then yields exactly what a
  // per-request query would.
  const [recent, popular] = await Promise.all([
    listPublished(desc(galleryItem.createdAt)),
    listPublished(desc(galleryItem.downloadCount), desc(galleryItem.createdAt)),
  ]);
  const byId = new Map([...recent, ...popular].map((row) => [row.id, row]));
  const items = [...byId.values()].map(toGalleryCardItem);

  return (
    <Suspense
      fallback={<GalleryListing items={items} sort="recent" tag={null} />}
    >
      <GalleryBrowser items={items} />
    </Suspense>
  );
}
