"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient, Guide } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function GuidePage() {
  const params = useParams();
  const { user } = useAuth();
  const slug = params.slug as string;

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchGuide = async () => {
      const supabase = createClient();
      // Slugs are stored lowercase; normalise so /guides/Git resolves like /guides/git.
      const { data } = await supabase
        .from("guides")
        .select("*")
        .eq("slug", slug.toLowerCase())
        .maybeSingle();
      if (cancelled) return;
      setGuide(data);
      setLoading(false);
    };
    fetchGuide();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const startEditing = () => {
    if (!guide) return;
    setEditContent(guide.content);
    setEditTitle(guide.title);
    setEditing(true);
    setShowPreview(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!guide) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("guides")
      .update({
        content: editContent,
        title: editTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", guide.id)
      .select()
      .single();
    if (error) {
      setSaveError(`Couldn't save: ${error.message}`);
      setSaving(false);
      return;
    }
    if (data) {
      setSaveError(null);
      setGuide(data);
      setEditing(false);
    }
    setSaving(false);
  };

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

  if (!guide) {
    return (
      <div className="max-w-text mx-auto px-6 pt-20 pb-24">
        <p className="meta mb-5">Not found</p>
        <h1 className="page-title mb-5">No guide at this address.</h1>
        <p className="lead mb-8">
          Guide URLs are lowercase and made of hyphens — <code>/guides/git-basics</code>.
        </p>
        <Link href="/guides" className="btn">
          All guides
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-text mx-auto px-6 pb-24">
      <nav aria-label="Breadcrumb" className="pt-12 pb-8">
        <ol className="flex items-center gap-2 meta">
          <li>
            <Link href="/guides" className="hover:text-[var(--accent)] transition-colors">
              Guides
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[var(--ink-2)]">{guide.slug}</li>
        </ol>
      </nav>

      {editing ? (
        <div className="space-y-4">
          <label htmlFor="guide-title" className="meta">
            Title
          </label>
          <input
            id="guide-title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="field font-serif text-xl"
          />

          <div className="flex items-center gap-1 border-b border-[var(--rule)] pb-3">
            <button
              onClick={() => setShowPreview(false)}
              aria-pressed={!showPreview}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${
                !showPreview ? "text-[var(--accent)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setShowPreview(true)}
              aria-pressed={showPreview}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${
                showPreview ? "text-[var(--accent)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"
              }`}
            >
              Preview
            </button>
            <div className="flex-1" />
            <button onClick={handleSave} disabled={saving} className="btn">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="btn-quiet ml-2">
              Cancel
            </button>
          </div>

          {saveError && (
            <div role="alert" className="alert">
              {saveError}
            </div>
          )}

          {showPreview ? (
            <div className="prose border border-[var(--rule)] p-6 min-h-[30rem]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
            </div>
          ) : (
            <>
              <label htmlFor="guide-body" className="sr-only">
                Guide content, in Markdown
              </label>
              <textarea
                id="guide-body"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="field-area w-full min-h-[30rem] font-mono text-[0.8125rem] leading-relaxed"
                placeholder="Write in Markdown…"
              />
            </>
          )}

          <p className="data text-[var(--ink-3)]">
            Markdown: # headings · **bold** · *italic* · `code` · tables · links
          </p>
        </div>
      ) : (
        <article>
          <header className="mb-10 pb-8 border-b border-[var(--rule-strong)]">
            <div className="flex items-start justify-between gap-6">
              <h1 className="page-title">{guide.title}</h1>
              {user && (
                <button onClick={startEditing} className="btn-quiet shrink-0">
                  Edit
                </button>
              )}
            </div>
            {guide.updated_at && (
              <p className="data mt-4 text-[var(--ink-3)]">
                Updated{" "}
                <time dateTime={guide.updated_at}>
                  {new Date(guide.updated_at).toLocaleDateString("en-CA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </p>
            )}
          </header>

          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{guide.content}</ReactMarkdown>
          </div>
        </article>
      )}
    </div>
  );
}
