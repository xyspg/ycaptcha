import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="">
      Landing Page
      <Button>
        <Link href="/login">Get Started</Link>
      </Button>
    </div>
  );
}
