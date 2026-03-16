import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center px-8 md:px-16 lg:px-24">
      <div className="grid w-full grid-cols-1 items-center gap-12 md:grid-cols-2">
        {/* Left side */}
        <div className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
          <Image
            src="/ycaptcha.webp"
            alt="yCAPTCHA"
            width={320}
            height={96}
            priority
          />
          <h1 className="font-heading text-4xl font-bold tracking-tight">
            Customize your CAPTCHA
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Create and deploy your own custom image-based CAPTCHA challenges.
          </p>
          <Button asChild size="lg">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>

        {/* Right side — placeholder CAPTCHA cards */}
        <div className="relative hidden aspect-square md:block">
          <div className="absolute left-[5%] top-[15%] h-[75%] w-[55%] rounded-xl border bg-card shadow-lg" />
          <div className="absolute left-[25%] top-[0%] h-[75%] w-[55%] rounded-xl border bg-card shadow-xl" />
          <div className="absolute left-[45%] top-[25%] h-[75%] w-[55%] rounded-xl border bg-card shadow-md" />
        </div>
      </div>
    </div>
  );
}
