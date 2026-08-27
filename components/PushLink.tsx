"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

/** Navbar left→right order. Direction is computed by comparing the
 *  current pathname's index to the target's index in this list.
 *  Notes is included so direction math stays consistent whether or
 *  not the user is signed in. Off-list routes default to forward. */
const NAV_ORDER = ["/", "/websites", "/journey", "/guides", "/wishlist", "/notes"];

const indexOf = (path: string): number =>
  NAV_ORDER.findIndex((p) =>
    p === "/" ? path === "/" : path === p || path.startsWith(p + "/")
  );

type DocumentWithVT = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

type PushLinkProps = {
  href: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/** Link that plays a horizontal "push" view transition on navigation.
 *  Direction is set by comparing NAV_ORDER positions and stashed as
 *  --push-direction on <html> for the CSS keyframes to consume.
 *  Browsers without View Transitions API fall through to regular
 *  Next.js Link navigation with no animation. */
export default function PushLink({ href, children, onClick, ...rest }: PushLinkProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    // Modifier / middle clicks open in new tab — let the browser handle them.
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    const doc = document as DocumentWithVT;
    if (!doc.startViewTransition) return;

    const fromIndex = indexOf(pathname);
    const toIndex = indexOf(href);
    // Clicking the current section — nothing to animate, let Link no-op.
    if (fromIndex === toIndex && fromIndex !== -1) return;

    event.preventDefault();

    // Off-list source or target → default to forward. Otherwise higher
    // index means "further right in the navbar" so slide leftward.
    const direction =
      fromIndex === -1 || toIndex === -1 ? 1 : toIndex > fromIndex ? 1 : -1;
    document.documentElement.style.setProperty("--push-direction", String(direction));
    document.documentElement.classList.add("vt-push");

    const t = doc.startViewTransition(() => {
      router.push(href);
    });
    t.finished.finally(() => {
      document.documentElement.classList.remove("vt-push");
    });
  };

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
