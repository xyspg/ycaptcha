"use client";

// The browse page is static; sort and tag live in the URL and are read on the
// client. Plain clicks update the URL with the History API, which Next syncs
// into useSearchParams. A router navigation would fetch nothing new, and one
// back to the bare /gallery rewrite gets dropped (the router restores the
// previous search). The current pathname is kept so pinned-locale URLs like
// /landing/ja/gallery stay put.

const BROWSE_PATH = /^\/(landing\/[^/]+\/)?gallery\/?$/;

function isPlainClick(e: React.MouseEvent) {
  return !(e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
}

// `search` is "" or "?sort=...".
export function SearchLink({
  search,
  onClick,
  ...props
}: Omit<React.ComponentProps<"a">, "href"> & { search: string }) {
  return (
    <a
      {...props}
      href={`/gallery${search}`}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !isPlainClick(e)) return;
        e.preventDefault();
        window.history.pushState(null, "", window.location.pathname + search);
      }}
    />
  );
}

// Header link to the browse page: resets sort and tag in place when already
// there, and is an ordinary link from the item and "mine" pages (a different
// root layout, so a full load either way).
export function GalleryBrowseLink({
  onClick,
  ...props
}: Omit<React.ComponentProps<"a">, "href">) {
  return (
    <a
      {...props}
      href="/gallery"
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !isPlainClick(e)) return;
        if (!BROWSE_PATH.test(window.location.pathname)) return;
        e.preventDefault();
        window.history.pushState(null, "", window.location.pathname);
      }}
    />
  );
}
