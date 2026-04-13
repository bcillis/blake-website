"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, Guide } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const defaultIcons: Record<string, string> = {
  git: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
  unity: "M12 2L2 7v10l10 5 10-5V7L12 2z",
  default: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
};

export default function GuidesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", slug: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGuides();
  }, []);

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
    const slug = formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("guides")
      .insert([{
        title: formData.title,
        slug,
        content: `# ${formData.title}\n\nStart writing your guide here...\n`,
        icon: "default",
      }])
      .select()
      .single();

    if (!error && data) {
      router.push(`/guides/${data.slug}`);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this guide?")) return;
    const supabase = createClient();
    await supabase.from("guides").delete().eq("id", id);
    setGuides(guides.filter((g) => g.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Reference Guides
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          How-to guides and references for tools and technologies. Written for future me.
        </p>
      </div>

      {/* Guides grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
              <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              href={`/guides/${guide.slug}`}
              className="card-interactive p-6 group relative"
            >
              <div className="p-2.5 rounded-xl bg-accent-100 dark:bg-accent-900/30 inline-flex mb-4">
                <svg className="w-6 h-6 text-accent-600 dark:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={defaultIcons[guide.icon] || defaultIcons.default} />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                {guide.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {guide.content.split("\n").filter(Boolean).slice(1, 2).join("").replace(/[#*_]/g, "").trim().slice(0, 80) || "No content yet"}
                {guide.content.length > 80 && "..."}
              </p>
              <div className="mt-3 text-accent-600 dark:text-accent-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Read guide
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>

              {user && (
                <button
                  onClick={(e) => handleDelete(guide.id, e)}
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </Link>
          ))}

          {/* New guide card */}
          {user && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="card border-dashed border-2 border-gray-300 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-3 hover:border-accent-500 dark:hover:border-accent-500 hover:bg-accent-50/50 dark:hover:bg-accent-900/10 transition-colors min-h-[180px]"
            >
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-sm font-medium text-gray-500">New Guide</span>
            </button>
          )}
        </div>
      )}

      {/* New guide form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 max-w-lg mx-auto mt-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Create New Guide</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              placeholder="e.g. Git & GitHub Basics"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL Slug <span className="text-gray-400">(optional)</span>
            </label>
            <input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="input-field"
              placeholder="auto-generated from title"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Creating..." : "Create Guide"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {!loading && guides.length === 0 && !user && (
        <div className="text-center py-16">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="text-gray-500 dark:text-gray-500">No guides yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
