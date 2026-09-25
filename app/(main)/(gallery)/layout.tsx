import { GalleryShell } from "@/components/gallery/gallery-shell";

// Item and "mine" pages. The browse page itself is static and lives under
// the landing root layout (app/(landing)/landing/[locale]/gallery).
export default function GalleryShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <GalleryShell>{children}</GalleryShell>
    </div>
  );
}
