"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient, Guide } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { FadeUp } from "@/components/Motion";

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

  useEffect(() => {
    fetchGuide();
  }, [slug]);

  const fetchGuide = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("guides").select("*").eq("slug", slug).single();
    setGuide(data);
    setLoading(false);
  };

  const startEditing = () => {
    if (!guide) return;
    setEditContent(guide.content);
    setEditTitle(guide.title);
    setEditing(true);
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!guide) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("guides")
      .update({ content: editContent, title: editTitle, updated_at: new Date().toISOString() })
      .eq("id", guide.id)
      .select()
      .single();
    if (!error && data) {
      setGuide(data);
      setEditing(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="h-6 skeleton w-1/3 mb-4" />
        <div className="h-3 skeleton w-full mb-2" />
        <div className="h-3 skeleton w-5/6" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-[var(--text-primary)] mb-4">Guide not found</h1>
        <Link href="/guides" className="btn-primary">← Back to guides</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pb-24">
      <FadeUp>
        <div className="pt-12 pb-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Link href="/guides" className="hover:text-[var(--accent)] transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-[var(--text-secondary)]">{guide.slug}</span>
        </div>
      </FadeUp>

      {editing ? (
        <div className="space-y-4">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input-field font-serif text-2xl"
          />
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <button
              onClick={() => setShowPreview(false)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                !showPreview ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                showPreview ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Preview
            </button>
            <div className="flex-1" />
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
          </div>

          {showPreview ? (
            <div className="card prose-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[500px] p-4 font-mono text-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] transition-all resize-y"
              placeholder="Write your guide in markdown..."
            />
          )}

          <div className="text-xs text-[var(--text-muted)]">
            Markdown supported: # headings · **bold** · *italic* · `code` · tables · links
          </div>
        </div>
      ) : (
        <article>
          <FadeUp delay={0.05}>
            <div className="flex items-start justify-between gap-4 mb-8">
              <h1 className="font-serif text-4xl sm:text-5xl leading-tight text-[var(--text-primary)] tracking-[-0.02em]">
                {guide.title}
              </h1>
              {user && (
                <button onClick={startEditing} className="btn-secondary text-sm flex-shrink-0">
                  Edit
                </button>
              )}
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="prose-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{guide.content}</ReactMarkdown>
            </div>
          </FadeUp>
          {guide.updated_at && (
            <p className="mt-12 pt-6 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
              Last updated{" "}
              {new Date(guide.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </article>
      )}
    </div>
  );
}
