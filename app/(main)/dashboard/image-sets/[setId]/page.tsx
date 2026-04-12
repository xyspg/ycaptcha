import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ImageSetDetail } from "./image-set-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const [session, { setId }] = await Promise.all([requireSession(), params]);

  const set = await db.query.imageSet.findFirst({
    where: (is, { and: a, eq: e }) =>
      a(e(is.id, setId), e(is.userId, session.user.id)),
    with: {
      images: {
        columns: { id: true, url: true, name: true },
        orderBy: (img, { asc }) => asc(img.createdAt),
      },
    },
  });

  if (!set) notFound();

  return (
    <ImageSetDetail set={{ id: set.id, name: set.name }} images={set.images} />
  );
}
