import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { DemoShowcase } from "./demo-showcase";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <HomePage />;
}

export function HomePage() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-8 py-12">
      <div className="grid w-full grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* Left Column: Content */}
        <div className="flex max-w-xl flex-col items-start">
          <div className="mb-4">
            <Image
              src="/ycaptcha.webp"
              alt="yCAPTCHA"
              width={450}
              height={135}
              style={{ height: "auto" }}
              className="-rotate-3"
              priority
            />
          </div>

          <div className="mb-8 space-y-3">
            <h1 className="font-heading text-[40px] font-bold leading-tight tracking-tight text-[#111] lg:text-[48px]">
              Customize your CAPTCHA
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-gray-600 lg:text-xl">
              Create and deploy your own custom image-based CAPTCHA challenges.
            </p>
          </div>

          <Button asChild size="lg">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>

        {/* Right Column: Interactive Demo */}
        <DemoShowcase />
      </div>
    </main>
  );
}
