interface ImageSetThumbnailProps {
  images: { id?: string; url: string; name?: string | null; contentHash?: string }[];
}

export function ImageSetThumbnail({ images }: ImageSetThumbnailProps) {
  return (
    <div className="grid grid-cols-5 gap-1 overflow-hidden rounded-md">
      {images.slice(0, 4).map((img, i) => (
        <img
          key={img.id ?? img.contentHash ?? i}
          src={img.url}
          alt={img.name ?? ""}
          className="aspect-square w-full object-cover"
        />
      ))}
      {images.length > 4 ? (
        <div className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
          ...
        </div>
      ) : (
        Array.from({ length: 5 - images.length }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square w-full bg-muted/30" />
        ))
      )}
    </div>
  );
}
