"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient, Website } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { FadeUp, StaggerGrid, StaggerCard } from "@/components/Motion";

const hostFromUrl = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
};

export default function WebsitesPage() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: "", description: "", url: "" });

  useEffect(() => {
    fetchWebsites();
  }, [user]);

  const fetchWebsites = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("websites").select("*").order("created_at", { ascending: false });
    setWebsites(data || []);
    setLoading(false);
  };

  const filteredWebsites = useMemo(() => {
    if (!search.trim()) return websites;
    const q = search.toLowerCase();
    return websites.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.url.toLowerCase().includes(q)
    );
  }, [websites, search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("websites")
      .insert([{ title: formData.title, description: formData.description, url: formData.url, user_id: user.id }])
      .select()
      .single();
    if (!error && data) {
      setWebsites([data, ...websites]);
      setFormData({ title: "", description: "", url: "" });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this website?")) return;
    const supabase = createClient();
    await supabase.from("websites").delete().eq("id", id);
    setWebsites(websites.filter((w) => w.id !== id));
  };

  const startEdit = (w: Website) => {
    setEditingId(w.id);
    setEditData({ title: w.title, description: w.description, url: w.url });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("websites")
      .update({ title: editData.title, description: editData.description, url: editData.url })
      .eq("id", editingId)
      .select()
      .single();
    if (!error && data) {
      setWebsites(websites.map((w) => (w.id === editingId ? data : w)));
      setEditingId(null);
    }
  };

  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      <header className="pt-16 pb-10 max-w-2xl">
        <FadeUp>
          <span className="eyebrow mb-4">The collection</span>
        </FadeUp>
        <FadeUp delay={0.05}>
          <h1 className="section-title mb-4">Websites you should know.</h1>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="lead">
            A growing collection of powerful tools and resources for developers —
            handpicked, with a sentence on why each one earns its spot.
          </p>
        </FadeUp>
      </header>

      <FadeUp delay={0.15}>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="text"
            placeholder="Search by title, description, or URL"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field sm:flex-1"
          />
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] sm:px-2">
            {String(filteredWebsites.length).padStart(2, "0")} entries
          </span>
          {user && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary whitespace-nowrap">
              + Add website
            </button>
          )}
        </div>
      </FadeUp>

      <AnimatePresence>
        {user && showForm && (
          <motion.form
            onSubmit={handleAdd}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3 }}
            className="card mb-8 space-y-3 overflow-hidden"
          >
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">New entry</div>
            <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field" placeholder="Title — e.g. DevDocs" required />
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="textarea-field" placeholder="Why is it useful?" rows={3} required />
            <input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="input-field" placeholder="https://devdocs.io" type="url" required />
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Adding..." : "Add"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="h-5 skeleton w-1/2 mb-3" />
              <div className="h-3 skeleton w-full mb-2" />
              <div className="h-3 skeleton w-3/4" />
            </div>
          ))}
        </div>
      ) : filteredWebsites.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-secondary)]">
            {search ? "No matches." : "No websites yet."}
          </p>
        </div>
      ) : (
        <StaggerGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWebsites.map((website) => (
            <StaggerCard key={website.id} className="h-full">
              {editingId === website.id ? (
                <form onSubmit={handleEdit} className="card space-y-3">
                  <input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className="input-field" required />
                  <textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="textarea-field min-h-[80px]" rows={2} required />
                  <input value={editData.url} onChange={(e) => setEditData({ ...editData, url: e.target.value })} className="input-field" required />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary">Save</button>
                    <button type="button" onClick={() => setEditingId(null)} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              ) : (
                <a
                  href={website.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-interactive group block h-full"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-serif text-xl text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                      {website.title}
                    </h3>
                    <span className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                      ↗
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                    {website.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="chip">{hostFromUrl(website.url)}</span>
                    {user && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(website); }}
                          className="btn-ghost text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(website.id); }}
                          className="btn-ghost text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </a>
              )}
            </StaggerCard>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}
