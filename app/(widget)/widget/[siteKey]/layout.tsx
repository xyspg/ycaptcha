import type { Metadata, Viewport } from "next";
import "../../../globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "yCAPTCHA",
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body style={{ background: "transparent", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
