"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient, Website } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import CardGrid from "@/components/CardGrid";
import EntryCard from "@/components/EntryCard";

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
    <div className="max-w-narrow mx-auto px-6 pb-24">
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
        <CardGrid>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="entry-card" aria-busy="true">
              <div className="entry-card-image skeleton" />
              <div className="entry-card-body">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3 w-1/2 mt-2" />
              </div>
            </div>
          ))}
        </CardGrid>
      ) : filteredWebsites.length === 0 ? (
        <div className="py-16 text-center text-[var(--ink-3)]">
          {search ? <>No entries match &ldquo;{search}&rdquo;.</> : "No entries yet."}
        </div>
      ) : (
        <CardGrid>
          {filteredWebsites.map((website) =>
            editingId === website.id ? (
              <form
                key={website.id}
                onSubmit={handleEdit}
                className="border border-[var(--rule-strong)] bg-[var(--surface)] p-3 space-y-2 col-span-full"
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
              <EntryCard
                key={website.id}
                title={website.title}
                href={website.url}
                imagePath={website.image_path}
                body={<p className="entry-card-desc">{website.description}</p>}
                ownerControls={
                  user ? (
                    <>
                      <button onClick={() => startEdit(website)}>
                        edit<span className="sr-only"> {website.title}</span>
                      </button>
                      <button onClick={() => handleDelete(website.id)}>
                        del<span className="sr-only"> {website.title}</span>
                      </button>
                    </>
                  ) : undefined
                }
              />
            )
          )}
        </CardGrid>
      )}
    </div>
  );
}
