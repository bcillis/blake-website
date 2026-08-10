"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, Guide } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

/** Lowercase, URL-safe slug. Lookups use `.eq("slug", …)`, which is case-sensitive. */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** First real line of the markdown body, used as the dek in the contents list. */
const previewLine = (content: string) => {
  const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  const cleaned = (lines[0] ?? "").replace(/[#*_`>]/g, "").trim();
  if (!cleaned) return null;
  return cleaned.length > 120 ? `${cleaned.slice(0, 120)}…` : cleaned;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

export default function GuidesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", slug: "" });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchGuides();
  }, [user]);

  const fetchGuides = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("guides")
      .select("*")
      .order("created_at", { ascending: true });
    setGuides(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Slugs are matched case-sensitively on lookup, so normalise on the way in.
    const slug = slugify(formData.slug || formData.title);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("guides")
      .insert([
        {
          title: formData.title,
          slug,
          content: `# ${formData.title}\n\n`,
          user_id: user?.id,
        },
      ])
      .select()
      .single();
    if (error) {
      setActionError(`Couldn't create the guide: ${error.message}`);
      setSubmitting(false);
      return;
    }
    if (data) {
      setActionError(null);
      router.push(`/guides/${data.slug}`);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this guide?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("guides").delete().eq("id", id);
    if (error) {
      setActionError(`Couldn't delete: ${error.message}`);
      return;
    }
    setActionError(null);
    setGuides(guides.filter((g) => g.id !== id));
  };

  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      <header className="pt-16 pb-10">
        <p className="meta mb-5">Contents</p>
        <h1 className="page-title mb-5">Guides.</h1>
        <p className="lead">
          Written references for things I want to remember how to do. Each one is a
          Markdown document I keep adding to.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3 pb-4">
        <span className="meta">
          {String(guides.length).padStart(2, "0")} {guides.length === 1 ? "guide" : "guides"}
        </span>
        {user && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-quiet">
            New guide
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
              <p className="meta">New guide</p>
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="field"
                placeholder="Title — e.g. Git & GitHub basics"
                required
              />
              <div>
                <input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="field"
                  placeholder="URL slug (optional)"
                />
                <p className="data mt-1.5 text-[var(--ink-3)]">
                  /guides/{slugify(formData.slug || formData.title) || "…"}
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={submitting} className="btn">
                  {submitting ? "Creating…" : "Create"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-quiet">
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
      ) : guides.length === 0 ? (
        <div className="index">
          <p className="py-16 text-[var(--ink-3)]">No guides yet.</p>
        </div>
      ) : (
        <ol className="index">
          {guides.map((guide, i) => {
            const dek = previewLine(guide.content);
            return (
              <li key={guide.id}>
                <article className="index-row group sm:grid-cols-[2.5rem_1fr_auto] sm:items-baseline">
                  <span
                    aria-hidden="true"
                    className="data text-[var(--ink-3)] group-hover:text-[var(--accent)] transition-colors"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <h2 className="row-title">
                      <Link href={`/guides/${guide.slug}`} className="stretched-link">
                        {guide.title}
                      </Link>
                    </h2>
                    {dek ? (
                      <p className="text-sm text-[var(--ink-2)] mt-1 max-w-[60ch]">{dek}</p>
                    ) : (
                      <p className="text-sm text-[var(--ink-3)] italic mt-1">Not written yet.</p>
                    )}
                    {user && (
                      <div className="row-actions mt-2.5">
                        <button onClick={() => handleDelete(guide.id)} className="btn-bare">
                          Delete<span className="sr-only"> {guide.title}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="data shrink-0 sm:text-right text-[var(--ink-3)]">
                    {guide.updated_at ? formatDate(guide.updated_at) : ""}
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
