import type { galleryItem } from "@/lib/db/app-schema";

type Row = typeof galleryItem.$inferSelect;

// Items per browse listing, shared by the query and the client-side sort.
export const GALLERY_PAGE_SIZE = 60;

// What a gallery card renders. Built on the server so the rows that reach the
// browser carry no author ids (anonymous items have one) or full image lists.
export type GalleryCardItem = {
  slug: string;
  title: string;
  description: string | null;
  // null when published anonymously
  author: string | null;
  tags: string[];
  imageCount: number;
  previewImages: { url: string; contentHash: string }[];
  downloadCount: number;
  createdAt: number;
};

export type GalleryCardRow = Pick<
  Row,
  | "slug"
  | "title"
  | "description"
  | "anonymous"
  | "authorDisplayName"
  | "tags"
  | "images"
  | "downloadCount"
  | "createdAt"
>;

export function toGalleryCardItem(row: GalleryCardRow): GalleryCardItem {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    author: row.anonymous ? null : row.authorDisplayName,
    tags: row.tags,
    imageCount: row.images.length,
    previewImages: row.images
      .slice(0, 4)
      .map(({ url, contentHash }) => ({ url, contentHash })),
    downloadCount: row.downloadCount,
    createdAt: row.createdAt.getTime(),
  };
}
