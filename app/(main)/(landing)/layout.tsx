export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-100/60 via-blue-50/40 via-30% to-orange-100/50 text-foreground dark:from-purple-950/40 dark:via-background dark:to-orange-950/30">
      {/* Background pattern overlays */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[10%] -top-[10%] h-[400px] w-[400px] rounded-full bg-purple-200/40 blur-3xl dark:bg-purple-800/20" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-orange-200/60 blur-3xl dark:bg-orange-800/20" />
      </div>

      {children}
    </div>
  );
}
