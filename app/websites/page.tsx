"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient, Website } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function WebsitesPage() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    url: "",
  });

  useEffect(() => {
    fetchWebsites();
  }, []);

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return null;

    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;

    try {
      return new URL(withProtocol).toString();
    } catch {
      return null;
    }
  };

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
    setSubmitting(true);

    const normalizedUrl = normalizeUrl(formData.url);

    if (!normalizedUrl) {
      alert("Please enter a valid website URL.");
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("websites")
      .insert([
        {
          title: formData.title,
          description: formData.description,
          url: normalizedUrl,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setWebsites([data, ...websites]);
      setFormData({ title: "", description: "", url: "" });
      setShowForm(false);
    } else {
      alert(error?.message || "Failed to add website.");
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
    setEditData({
      title: w.title,
      description: w.description,
      url: w.url,
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const normalizedUrl = normalizeUrl(editData.url);

    if (!normalizedUrl) {
      alert("Please enter a valid website URL.");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("websites")
      .update({
        title: editData.title,
        description: editData.description,
        url: normalizedUrl,
      })
      .eq("id", editingId)
      .select()
      .single();

    if (!error && data) {
      setWebsites(websites.map((w) => (w.id === editingId ? data : w)));
      setEditingId(null);
    } else {
      alert(error?.message || "Failed to update website.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Websites You Should Know
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          A growing collection of powerful tools and resources for developers.
        </p>
      </div>

      <div className="relative mb-8">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>

        <input
          type="text"
          placeholder="Search websites by title, description, or URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredWebsites.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-500">
            {search ? "No websites match your search." : "No websites saved yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWebsites.map((website) => (
            <div key={website.id} className="group relative">
              {editingId === website.id ? (
                <form onSubmit={handleEdit} className="card p-5 space-y-3">
                  <input
                    value={editData.title}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                    className="input-field text-sm"
                    placeholder="Title"
                    required
                  />
                  <textarea
                    value={editData.description}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    className="textarea-field text-sm"
                    placeholder="Description"
                    rows={2}
                    required
                  />
                  <input
                    value={editData.url}
                    onChange={(e) =>
                      setEditData({ ...editData, url: e.target.value })
                    }
                    className="input-field text-sm"
                    placeholder="URL"
                    required
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-sm flex-1">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <a
                  href={website.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-interactive block p-5"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                      {website.title}
                    </h3>
                    <svg
                      className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                    {website.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 truncate">
                    {website.url}
                  </p>
                </a>
              )}

              {user && editingId !== website.id && (
                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startEdit(website);
                    }}
                    className="p-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(website.id);
                    }}
                    className="p-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {user && (
        <div className="mt-8">
          {showForm ? (
            <form onSubmit={handleAdd} className="card p-6 max-w-lg mx-auto space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Add a Website
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="input-field"
                  placeholder="e.g. DevDocs"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="textarea-field"
                  placeholder="What does this website do? Why is it useful?"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL
                </label>
                <input
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  className="input-field"
                  placeholder="https://devdocs.io or devdocs.io"
                  type="text"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Adding..." : "Add Website"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mx-auto flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Website
            </button>
          )}
        </div>
      )}
    </div>
  );
}