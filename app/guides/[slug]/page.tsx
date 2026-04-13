"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient, Guide } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function GuidePage() {
  const params = useParams();
  const router = useRouter();
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
    const { data } = await supabase
      .from("guides")
      .select("*")
      .eq("slug", slug)
      .single();
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6 mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/6" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Guide not found</h1>
        <Link href="/guides" className="btn-primary">Back to Guides</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 mb-6">
        <Link href="/guides" className="hover:text-accent-600 dark:hover:text-accent-400">Guides</Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-900 dark:text-gray-100">{guide.title}</span>
      </div>

      {editing ? (
        /* Editor mode */
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input-field text-lg font-semibold"
            />
          </div>

          {/* Editor toolbar */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
            <button
              onClick={() => setShowPreview(false)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                !showPreview
                  ? "bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                showPreview
                  ? "bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Preview
            </button>
            <div className="flex-1" />
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>

          {showPreview ? (
            <div className="card p-6 prose-content min-h-[400px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[500px] p-4 font-mono text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-y"
              placeholder="Write your guide in Markdown..."
            />
          )}

          <div className="text-xs text-gray-500 dark:text-gray-500">
            Supports Markdown: # headings, **bold**, *italic*, `code`, ```code blocks```, - lists, [links](url), tables, and more.
          </div>
        </div>
      ) : (
        /* Read mode */
        <div>
          <div className="flex items-start justify-between gap-4 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{guide.title}</h1>
            {user && (
              <button onClick={startEditing} className="btn-secondary text-sm flex items-center gap-2 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit
              </button>
            )}
          </div>
          <div className="prose-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{guide.content}</ReactMarkdown>
          </div>
          {guide.updated_at && (
            <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">
              Last updated: {new Date(guide.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
