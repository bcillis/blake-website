"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, Note, NoteEntry } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

const textPreview = (entry: NoteEntry | undefined): string => {
  if (!entry) return "Empty";
  if (entry.kind === "image") return "[image]";
  const line = (entry.content ?? "").split("\n").find((l) => l.trim()) ?? "";
  return line.length > 120 ? `${line.slice(0, 120)}…` : line || "Empty";
};

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [firstEntries, setFirstEntries] = useState<Record<string, NoteEntry | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setNotes([]);
      setFirstEntries({});
      setLoading(false);
      return;
    }
    fetchNotes();
  }, [user, authLoading]);

  const fetchNotes = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: noteRows } = await supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false });
    const rows = noteRows ?? [];
    setNotes(rows);

    if (rows.length > 0) {
      const { data: entries } = await supabase
        .from("note_entries")
        .select("*")
        .in("note_id", rows.map((n) => n.id))
        .order("created_at", { ascending: true });
      const firstByNote: Record<string, NoteEntry> = {};
      for (const entry of entries ?? []) {
        if (!firstByNote[entry.note_id]) firstByNote[entry.note_id] = entry;
      }
      setFirstEntries(firstByNote);
    } else {
      setFirstEntries({});
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .insert([{ title, user_id: user.id }])
      .select()
      .single();
    if (error) {
      setActionError(`Couldn't create the note: ${error.message}`);
      setSubmitting(false);
      return;
    }
    if (data) {
      setActionError(null);
      router.push(`/notes/${data.id}`);
    }
    setSubmitting(false);
  };

  const handleDelete = async (note: Note) => {
    if (!confirm("Delete this note and all its entries?")) return;
    const supabase = createClient();

    const { data: imageRows } = await supabase
      .from("note_entries")
      .select("image_path")
      .eq("note_id", note.id)
      .eq("kind", "image");
    const paths = (imageRows ?? [])
      .map((r) => r.image_path)
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      await supabase.storage.from("note-images").remove(paths);
    }

    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (error) {
      setActionError(`Couldn't delete: ${error.message}`);
      return;
    }
    setActionError(null);
    setNotes(notes.filter((n) => n.id !== note.id));
  };

  if (!authLoading && !user) {
    return (
      <div className="max-w-page mx-auto px-6 pb-24">
        <header className="pt-16 pb-10">
          <p className="meta mb-5">Contents</p>
          <h1 className="page-title mb-5">Notes.</h1>
          <p className="lead">
            Personal chronological notes. This section is private — sign in to view.
          </p>
        </header>
        <div className="index">
          <p className="py-16 text-[var(--ink-3)]">
            <Link href="/login" className="underline hover:text-[var(--accent)]">
              Sign in
            </Link>{" "}
            to view your notes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      <header className="pt-16 pb-10">
        <p className="meta mb-5">Contents</p>
        <h1 className="page-title mb-5">Notes.</h1>
        <p className="lead">
          Chronological notes for whatever I want to remember later. Text and pasted
          images, one entry at a time.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3 pb-4">
        <span className="meta">
          {String(notes.length).padStart(2, "0")} {notes.length === 1 ? "note" : "notes"}
        </span>
        {user && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-quiet">
            New note
          </button>
        )}
      </div>

      {user && (
        <div className={`disclosure ${showForm ? "disclosure-open" : ""}`}>
          <div>
            <form
              onSubmit={handleCreate}
              className="mb-6 border border-[var(--rule-strong)] bg-[var(--surface)] p-5 space-y-3"
            >
              <p className="meta">New note</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="field"
                placeholder="Title — e.g. Elden Ring boss notes"
                required
              />
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={submitting || !title.trim()} className="btn">
                  {submitting ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setTitle("");
                  }}
                  className="btn-quiet"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionError && (
        <div role="alert" className="alert mb-6">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="index" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="index-row">
              <div className="h-5 skeleton w-1/3 mb-2" />
              <div className="h-3 skeleton w-2/3" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="index">
          <p className="py-16 text-[var(--ink-3)]">No notes yet.</p>
        </div>
      ) : (
        <ol className="index">
          {notes.map((note, i) => {
            const preview = textPreview(firstEntries[note.id]);
            return (
              <li key={note.id}>
                <article className="index-row group sm:grid-cols-[2.5rem_1fr_auto] sm:items-baseline">
                  <span
                    aria-hidden="true"
                    className="data text-[var(--ink-3)] group-hover:text-[var(--accent)] transition-colors"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <h2 className="row-title">
                      <Link href={`/notes/${note.id}`} className="stretched-link">
                        {note.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-[var(--ink-2)] mt-1 max-w-[60ch]">{preview}</p>
                    {user && (
                      <div className="row-actions mt-2.5">
                        <button onClick={() => handleDelete(note)} className="btn-bare">
                          Delete<span className="sr-only"> {note.title}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="data shrink-0 sm:text-right text-[var(--ink-3)]">
                    {note.updated_at ? formatDate(note.updated_at) : ""}
                  </span>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
