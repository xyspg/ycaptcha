import { GalleryShell } from "@/components/gallery/gallery-shell";
import { setStaticLocale } from "@/i18n/static-locale";

export default async function GalleryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticLocale(locale);

  return <GalleryShell>{children}</GalleryShell>;
}
