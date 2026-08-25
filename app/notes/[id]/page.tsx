"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient, Note, NoteEntry } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const IMAGE_URL_TTL_SECONDS = 60 * 60;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });

const formatDayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

const isSameDay = (a: string, b: string) => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

export default function NotePage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const noteId = params.id as string;

  const [note, setNote] = useState<Note | null>(null);
  const [entries, setEntries] = useState<NoteEntry[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data: noteRow } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .maybeSingle();
      if (cancelled) return;
      if (!noteRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setNote(noteRow);

      const { data: entryRows } = await supabase
        .from("note_entries")
        .select("*")
        .eq("note_id", noteId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const rows = entryRows ?? [];
      setEntries(rows);

      const imagePaths = rows
        .filter((r) => r.kind === "image" && r.image_path)
        .map((r) => r.image_path as string);
      if (imagePaths.length > 0) {
        const { data: signed } = await supabase.storage
          .from("note-images")
          .createSignedUrls(imagePaths, IMAGE_URL_TTL_SECONDS);
        if (cancelled) return;
        const byPath: Record<string, string> = {};
        for (const s of signed ?? []) {
          if (s.path && s.signedUrl) byPath[s.path] = s.signedUrl;
        }
        const byEntry: Record<string, string> = {};
        for (const r of rows) {
          if (r.kind === "image" && r.image_path && byPath[r.image_path]) {
            byEntry[r.id] = byPath[r.image_path];
          }
        }
        setSignedUrls(byEntry);
      }

      setLoading(false);
      // Defer to next paint so the DOM has heights measured.
      requestAnimationFrame(scrollToBottom);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [noteId, user, authLoading, scrollToBottom]);

  const sendText = async () => {
    const body = draft.trim();
    if (!body || !user || !note) return;
    setSending(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("note_entries")
      .insert([
        {
          note_id: note.id,
          user_id: user.id,
          kind: "text",
          content: body,
        },
      ])
      .select()
      .single();
    if (insertError) {
      setError(`Couldn't send: ${insertError.message}`);
      setSending(false);
      return;
    }
    if (data) {
      setError(null);
      setEntries((prev) => [...prev, data]);
      setDraft("");
      // Bump note.updated_at locally so the index list feels correct on back-nav.
      await supabase
        .from("notes")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", note.id);
      requestAnimationFrame(scrollToBottom);
    }
    setSending(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="max-w-text mx-auto px-6 pt-20 pb-24">
        <p className="meta mb-5">Private</p>
        <h1 className="page-title mb-5">This note is private.</h1>
        <p className="lead mb-8">
          Notes are only visible to the owner.{" "}
          <Link href="/login" className="underline hover:text-[var(--accent)]">
            Sign in
          </Link>{" "}
          to view.
        </p>
        <Link href="/" className="btn">
          Home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-text mx-auto px-6 pt-16" aria-busy="true">
        <div className="h-3 skeleton w-24 mb-8" />
        <div className="h-9 skeleton w-2/3 mb-6" />
        <div className="h-4 skeleton w-full mb-2.5" />
        <div className="h-4 skeleton w-5/6" />
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="max-w-text mx-auto px-6 pt-20 pb-24">
        <p className="meta mb-5">Not found</p>
        <h1 className="page-title mb-5">No note at this address.</h1>
        <Link href="/notes" className="btn">
          All notes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-text mx-auto px-6 pb-24 flex flex-col min-h-[calc(100vh-4rem)]">
      <nav aria-label="Breadcrumb" className="pt-12 pb-6">
        <ol className="flex items-center gap-2 meta">
          <li>
            <Link href="/notes" className="hover:text-[var(--accent)] transition-colors">
              Notes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[var(--ink-2)] truncate">{note.title}</li>
        </ol>
      </nav>

      <header className="pb-6 border-b border-[var(--rule-strong)]">
        <h1 className="page-title">{note.title}</h1>
        <p className="data mt-3 text-[var(--ink-3)]">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} · updated{" "}
          {new Date(note.updated_at).toLocaleDateString("en-CA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </header>

      <div
        ref={logRef}
        className="flex-1 overflow-y-auto py-6 space-y-4"
        aria-live="polite"
      >
        {entries.length === 0 ? (
          <p className="text-[var(--ink-3)] italic py-16 text-center">
            No entries yet. Type below and press Enter.
          </p>
        ) : (
          entries.map((entry, i) => {
            const prev = entries[i - 1];
            const showDay = !prev || !isSameDay(prev.created_at, entry.created_at);
            return (
              <div key={entry.id}>
                {showDay && (
                  <p className="meta py-2 border-b border-[var(--rule)] mb-3">
                    {formatDayLabel(entry.created_at)}
                  </p>
                )}
                <div className="grid grid-cols-[3.5rem_1fr] gap-3">
                  <time
                    dateTime={entry.created_at}
                    className="data text-[var(--ink-3)] pt-0.5"
                  >
                    {formatTime(entry.created_at)}
                  </time>
                  <div className="min-w-0">
                    {entry.kind === "text" ? (
                      <p className="whitespace-pre-wrap break-words text-[var(--ink)]">
                        {entry.content}
                      </p>
                    ) : entry.image_path && signedUrls[entry.id] ? (
                      <a
                        href={signedUrls[entry.id]}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signedUrls[entry.id]}
                          alt=""
                          className="max-h-[400px] border border-[var(--rule)]"
                          style={{ borderRadius: "2px" }}
                        />
                      </a>
                    ) : (
                      <p className="text-[var(--ink-3)] italic text-sm">
                        [image unavailable]
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div role="alert" className="alert mb-3">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 bg-[var(--bg)] border-t border-[var(--rule)] pt-3 pb-4">
        <label htmlFor="note-input" className="sr-only">
          New entry
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="note-input"
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            className="field-area flex-1 font-serif text-sm"
            placeholder="Write a note, or paste an image (Ctrl+V)…"
          />
          <button
            onClick={sendText}
            disabled={sending || !draft.trim()}
            className="btn"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
