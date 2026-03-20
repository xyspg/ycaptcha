import { eq } from "drizzle-orm";
import Link from "next/link";
import { Images, Plus } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { imageSet } from "@/lib/db/app-schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function Page() {
  const session = await requireSession();

  const sets = await db.query.imageSet.findMany({
    where: (is, { eq: e }) => e(is.userId, session.user.id),
    with: {
      images: {
        columns: { id: true, url: true, name: true },
        limit: 5,
        orderBy: (img, { asc }) => asc(img.createdAt),
      },
    },
    orderBy: (is, { desc }) => desc(is.createdAt),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Image Sets</h1>
        <Button asChild>
          <Link href="/dashboard/image-sets/new">
            <Plus className="size-4" /> Create Image Set
          </Link>
        </Button>
      </div>

      {sets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Images className="size-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No image sets yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an image set and upload images to use in puzzles.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/dashboard/image-sets/new">
                <Plus className="size-4" /> Create Image Set
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => (
            <Link key={s.id} href={`/dashboard/image-sets/${s.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <CardDescription>
                    {s.images.length}{s.images.length === 5 ? "+" : ""} image{s.images.length === 1 ? "" : "s"}
                    {" · "}
                    {s.createdAt.toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                {s.images.length > 0 && (
                  <CardContent>
                    <div className="flex gap-1 overflow-hidden rounded-md">
                      {s.images.slice(0, 4).map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt={img.name ?? ""}
                          className="size-16 object-cover"
                        />
                      ))}
                      {s.images.length > 4 && (
                        <div className="flex size-16 items-center justify-center bg-muted text-xs text-muted-foreground">
                          ...
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
