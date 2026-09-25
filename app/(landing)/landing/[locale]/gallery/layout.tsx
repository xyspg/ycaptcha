import { setRequestLocale } from "next-intl/server";
import { GalleryShell } from "@/components/gallery/gallery-shell";

export default async function GalleryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <GalleryShell>{children}</GalleryShell>;
}
