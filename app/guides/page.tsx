"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient, Guide } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { FadeUp, StaggerGrid, StaggerCard } from "@/components/Motion";

const previewLine = (content: string) => {
  const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  const first = lines[0] ?? "";
  const cleaned = first.replace(/[#*_`>]/g, "").trim();
  return cleaned.length > 110 ? cleaned.slice(0, 110) + "…" : cleaned || "No content yet.";
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
  }, [user]);

  const fetchGuides = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("guides").select("*").order("created_at", { ascending: true });
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
        user_id: user?.id,
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
    <div className="max-w-page mx-auto px-6 pb-24">
      <header className="pt-16 pb-10 max-w-2xl">
        <FadeUp>
          <span className="eyebrow mb-4">Reference library</span>
        </FadeUp>
        <FadeUp delay={0.05}>
          <h1 className="section-title mb-4">Guides for future me.</h1>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="lead">
            How-to guides and references for tools and technologies — Git, Unity,
            game dev, and more. Written in markdown.
          </p>
        </FadeUp>
      </header>

      <FadeUp delay={0.15}>
        <div className="mb-8 flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {String(guides.length).padStart(2, "0")} guides
          </span>
          {user && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + New guide
            </button>
          )}
        </div>
      </FadeUp>

      <AnimatePresence>
        {user && showForm && (
          <motion.form
            onSubmit={handleCreate}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3 }}
            className="card mb-8 space-y-3 overflow-hidden"
          >
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">New guide</div>
            <input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              placeholder="Title — e.g. Git & GitHub basics"
              required
            />
            <input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="input-field"
              placeholder="URL slug (optional, auto-generated)"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="h-5 skeleton w-1/2 mb-3" />
              <div className="h-3 skeleton w-full" />
            </div>
          ))}
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-secondary)]">No guides yet.</p>
        </div>
      ) : (
        <StaggerGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <StaggerCard key={guide.id} className="h-full">
              <Link href={`/guides/${guide.slug}`} className="card-interactive group block h-full relative">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    §
                  </span>
                  <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    /{guide.slug}
                  </span>
                </div>
                <h3 className="font-serif text-xl text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-2 leading-tight">
                  {guide.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                  {previewLine(guide.content)}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] group-hover:gap-2 transition-all">
                  Read guide <span>→</span>
                </span>

                {user && (
                  <button
                    onClick={(e) => handleDelete(guide.id, e)}
                    aria-label="Delete guide"
                    className="absolute top-3 right-3 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                )}
              </Link>
            </StaggerCard>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}
