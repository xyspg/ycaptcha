import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import Image from "next/image";
import type { ReactNode } from "react";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<RootProvider>
			<DocsLayout
				tree={source.getPageTree()}
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
