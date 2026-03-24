export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`html { color-scheme: light !important; } body { background: transparent !important; margin: 0; padding: 0; }`}</style>
      <div className="light">{children}</div>
    </>
  );
}
