"use client";

import Link from "next/link";

/** Shown in place of the content on private pages (/websites, /guides,
 *  /wishlist) when the visitor is not signed in. The page still renders
 *  its own header — this component only replaces the list/detail body. */
export default function SignInRequired({ label }: { label: string }) {
  return (
    <div className="border border-[var(--rule)] bg-[var(--surface)] p-8 text-center">
      <p className="meta mb-3">Private</p>
      <p className="text-[var(--ink-2)] mb-6">
        {label} is only visible when you&apos;re signed in.
      </p>
      <Link href="/login" className="btn">
        Sign in
      </Link>
    </div>
  );
}
