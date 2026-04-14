import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { i18nUI } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default async function Layout({ children }: { children: ReactNode }) {
	const locale = await getLocale();

	return (
		<RootProvider i18n={i18nUI.provider(locale)}>
			<DocsLayout
				tree={source.getPageTree(locale)}
				nav={{
					title: (
						<span className="inline-flex items-center gap-2 font-semibold">
							<Image
								src="/favicon.ico"
								alt="yCAPTCHA"
								width={24}
								height={24}
								unoptimized
							/>
							yCAPTCHA
						</span>
					),
				}}
			>
				{children}
			</DocsLayout>
		</RootProvider>
	);
}
