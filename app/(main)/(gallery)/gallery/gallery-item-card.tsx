import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { galleryItem } from "@/lib/db/app-schema";

type Item = typeof galleryItem.$inferSelect;

export async function GalleryItemCardContent({ item }: { item: Item }) {
  const t = await getTranslations("gallery");
  const previewImages = item.images.slice(0, 4);

  return (
    <>
      <div className="relative grid aspect-[4/3] grid-cols-2 gap-1 overflow-hidden rounded-lg bg-muted">
        {previewImages.length > 0 ? (
          previewImages.map((img, i) => (
            <div
              key={`${img.contentHash}-${i}`}
              className="relative size-full overflow-hidden bg-muted"
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform group-hover:scale-[1.03]"
                unoptimized
              />
            </div>
          ))
        ) : (
          <div className="col-span-2 flex size-full items-center justify-center text-xs text-muted-foreground">
            {t("cardEmptyPreview")}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-1 pb-1">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          <span>{t("cardImages", { count: item.images.length })}</span>
          <span>·</span>
          <span>{t("cardForks", { count: item.downloadCount })}</span>
        </div>
        <div className="font-heading text-base font-semibold tracking-tight">
          {item.title}
        </div>
        {item.description && (
          <div className="line-clamp-3 text-sm text-muted-foreground">
            {item.description}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="text-xs text-muted-foreground">
            {t("cardBy")}{" "}
            <span className="font-medium text-foreground/70">
              {item.anonymous ? t("cardAnonymous") : item.authorDisplayName}
            </span>
          </div>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function GalleryItemCard({ item }: { item: Item }) {
  return (
    <Link
      href={`/gallery/${item.slug}`}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-background/70 p-3 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg"
    >
      <GalleryItemCardContent item={item} />
    </Link>
  );
}
