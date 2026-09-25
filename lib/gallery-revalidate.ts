import { revalidatePath } from "next/cache";

// Refreshes the static gallery browse page for every locale. /gallery is a
// rewrite, so this targets the destination route, and it must include the
// route group: a page's cache tag is derived from its file path.
export function revalidateGalleryBrowse() {
  revalidatePath("/(landing)/landing/[locale]/gallery", "page");
}
