import { GalleryShell } from "@/components/gallery/gallery-shell";
import { getSession } from "@/lib/auth/session";

// Item and "mine" pages. The browse page itself is static and lives under
// the landing root layout (app/(landing)/landing/[locale]/gallery).
export default async function GalleryShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // shared with the pages' own getSession() via cache(): one Redis read
  const session = await getSession();

  return (
    <div className="relative min-h-screen bg-[oklch(0.98_0.006_95)] text-foreground dark:bg-[oklch(0.17_0.004_270)]">
      {/* Faint paper-texture grid — visually separates gallery from the main app */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.06] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <GalleryShell signedIn={!!session}>{children}</GalleryShell>
    </div>
  );
}
