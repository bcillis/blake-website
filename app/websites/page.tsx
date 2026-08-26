"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient, Website } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { hostFromUrl } from "@/lib/url";

export default function WebsitesPage() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
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
    const { data } = await supabase
      .from("websites")
      .select("*")
      .order("created_at", { ascending: false });
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
      .insert([
        {
          title: formData.title,
          description: formData.description,
          url: formData.url,
          user_id: user.id,
        },
      ])
      .select()
      .single();
    if (error) {
      setActionError(`Couldn't add: ${error.message}`);
      setSubmitting(false);
      return;
    }
    if (data) {
      setActionError(null);
      setWebsites([data, ...websites]);
      setFormData({ title: "", description: "", url: "" });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this website?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("websites").delete().eq("id", id);
    if (error) {
      setActionError(`Couldn't delete: ${error.message}`);
      return;
    }
    setActionError(null);
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
    if (error) {
      setActionError(`Couldn't save: ${error.message}`);
      return;
    }
    if (data) {
      setActionError(null);
      setWebsites(websites.map((w) => (w.id === editingId ? data : w)));
      setEditingId(null);
    }
  };

  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      <header className="pt-16 pb-10">
        <p className="meta mb-5">Index</p>
        <h1 className="page-title mb-5">Websites.</h1>
        {/*
          Previous copy promised "a sentence on why each one earns its spot",
          which several entries don't have. This says what's actually here.
        */}
        <p className="lead">
          Tools, references and sites I&apos;ve collected while studying and building
          software. Newest first.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4">
        <label htmlFor="site-search" className="sr-only">
          Search websites
        </label>
        <input
          id="site-search"
          type="search"
          placeholder="Search title, description or URL"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field sm:max-w-sm"
        />
        <span className="meta sm:ml-auto" aria-live="polite">
          {String(filteredWebsites.length).padStart(2, "0")}
          {search ? ` of ${websites.length}` : ""} entries
        </span>
        {user && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-quiet whitespace-nowrap">
            Add entry
          </button>
        )}
      </div>

      {user && (
        <div className={`disclosure ${showForm ? "disclosure-open" : ""}`}>
          <div>
            <form
              onSubmit={handleAdd}
              className="mb-6 border border-[var(--rule-strong)] bg-[var(--surface)] p-5 space-y-3"
            >
              <p className="meta">New entry</p>
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="field"
                placeholder="Title"
                required
              />
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="field-area"
                placeholder="What is it for?"
                rows={3}
                required
              />
              <input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="field"
                placeholder="https://devdocs.io"
                type="url"
                required
              />
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={submitting} className="btn">
                  {submitting ? "Adding…" : "Add"}
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
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="index-row">
              <div className="h-5 skeleton w-1/3 mb-2" />
              <div className="h-3 skeleton w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredWebsites.length === 0 ? (
        <div className="index">
          <p className="py-16 text-[var(--ink-3)]">
            {search ? `No entries match “${search}”.` : "No entries yet."}
          </p>
        </div>
      ) : (
        <ul className="index">
          {filteredWebsites.map((website) => (
            <li key={website.id}>
              {editingId === website.id ? (
                <form
                  onSubmit={handleEdit}
                  className="border-b border-[var(--rule)] py-5 space-y-3"
                >
                  <p className="meta">Editing</p>
                  <input
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="field"
                    aria-label="Title"
                    required
                  />
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="field-area min-h-[5rem]"
                    aria-label="Description"
                    rows={2}
                    required
                  />
                  <input
                    value={editData.url}
                    onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                    className="field"
                    aria-label="URL"
                    type="url"
                    required
                  />
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="btn">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="btn-quiet">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <article className="index-row group sm:grid-cols-[1fr_auto] sm:items-baseline">
                  <div className="min-w-0">
                    <h2 className="row-title">
                      <a
                        href={website.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="stretched-link"
                      >
                        {website.title}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </h2>
                    <p className="text-sm text-[var(--ink-2)] mt-1 max-w-[60ch]">
                      {website.description}
                    </p>
                    {user && (
                      <div className="row-actions mt-2.5 flex items-center gap-4">
                        <button onClick={() => startEdit(website)} className="btn-bare">
                          Edit<span className="sr-only"> {website.title}</span>
                        </button>
                        <button onClick={() => handleDelete(website.id)} className="btn-bare">
                          Delete<span className="sr-only"> {website.title}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="data shrink-0 sm:text-right group-hover:text-[var(--accent)] transition-colors">
                    {hostFromUrl(website.url)}
                  </span>
                </article>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
