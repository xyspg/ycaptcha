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
    <>
      {/* Hero — full screen on mobile, side-by-side with demo on desktop */}
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center px-8 py-12 lg:flex-row lg:gap-16">
        {/* Left: Content */}
        <div className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
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
            <h1 className="font-heading text-[40px] font-bold leading-tight tracking-tight text-foreground lg:text-[48px]">
              Customize your CAPTCHA
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground lg:text-xl">
              Create and deploy your own custom image-based CAPTCHA challenges.
            </p>
          </div>

          <Button asChild size="lg">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>

        {/* Right: Demo — desktop inline, mobile hidden (shown below) */}
        <div className="hidden lg:block">
          <DemoShowcase />
        </div>
      </section>

      {/* Demo section — mobile only, below hero */}
      <section className="relative z-10 flex flex-col items-center px-4 pb-16 lg:hidden">
        <DemoShowcase />
      </section>
    </>
  );
}
