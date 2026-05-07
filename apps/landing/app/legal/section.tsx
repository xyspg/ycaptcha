export function Section({
  id,
  title,
  size = "lg",
  children,
}: {
  id?: string;
  title: string;
  size?: "lg" | "xl";
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`flex flex-col gap-3${id ? " scroll-mt-24" : ""}`}
    >
      <h2
        className={`font-heading ${size === "xl" ? "text-xl" : "text-lg"} font-semibold tracking-tight`}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-foreground/80">
        {children}
      </div>
    </section>
  );
}
