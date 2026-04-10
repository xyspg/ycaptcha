import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { DemoShowcase } from "./demo-showcase";

export default async function Home() {
	const session = await getSession();
	if (session) redirect("/dashboard");

	return <HomePage />;
}

export function HomePage() {
	return (
		<>
			<div className="absolute right-6 top-6 z-20">
				<ThemeSwitcher />
			</div>
			<section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center px-8 py-12 lg:flex-row lg:gap-16">
				<div className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
					<div className="mb-4">
						<Image
							src="/ycaptcha.webp"
							alt="yCAPTCHA"
							width={450}
							height={135}
							style={{ width: "auto", height: "auto" }}
							className="-rotate-3"
							priority
						/>
					</div>

					<div className="mb-8 space-y-3">
						<h1 className="font-heading text-[40px] font-bold leading-tight tracking-tight text-foreground lg:text-[48px]">
							Stop Picking Traffic Lights
						</h1>
						<p className="max-w-md text-lg leading-relaxed text-muted-foreground lg:text-xl">
							The customizable image CAPTCHA for your site.
						</p>
					</div>

					<div className="flex flex-row gap-4 items-center">
						<Button asChild size="lg">
							<Link href="/login">Get Started</Link>
						</Button>

						<Button asChild variant="outline" size="lg">
							<Link href="/docs">Read Docs</Link>
						</Button>
					</div>
				</div>

				<div className="hidden lg:block">
					<DemoShowcase />
				</div>
			</section>

			<section className="relative z-10 flex flex-col items-center px-4 pb-16 lg:hidden">
				<DemoShowcase />
			</section>
		</>
	);
}
