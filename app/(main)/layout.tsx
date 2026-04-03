import type { Metadata, Viewport } from "next";
import { Caveat, Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
	variable: "--font-plus-jakarta",
	subsets: ["latin"],
});

const caveat = Caveat({
	variable: "--font-caveat",
	subsets: ["latin"],
});

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
};

export const metadata: Metadata = {
	title: "yCAPTCHA",
	description: "Customize your own CAPTCHA",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} ${caveat.variable} flex min-h-screen flex-col font-sans antialiased`}
			>
				<Script
					defer
					src="https://mizuki.xyspg.moe/akiyama"
					data-website-id="31902df6-c1da-4e2a-93fd-d5f2a84b2bc3"
					data-domains="ycaptcha.xyspg.moe"
					strategy="afterInteractive"
				/>
				<Providers>
					{children}
					<Toaster />
					<Analytics />
					<SpeedInsights />
				</Providers>
			</body>
		</html>
	);
}
