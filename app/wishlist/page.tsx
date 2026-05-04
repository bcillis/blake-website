"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient, WishlistItem } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);

export default function WishlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", price: "", link: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: "", price: "", link: "" });

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("wishlist")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.link.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPrice = useMemo(
    () => filteredItems.reduce((sum, i) => sum + Number(i.price || 0), 0),
    [filteredItems]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const priceNum = parseFloat(formData.price);
    if (Number.isNaN(priceNum) || priceNum < 0) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("wishlist")
      .insert([{ title: formData.title, price: priceNum, link: formData.link, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      setItems([data, ...items]);
      setFormData({ title: "", price: "", link: "" });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this wishlist item?")) return;
    const supabase = createClient();
    await supabase.from("wishlist").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  };

  const startEdit = (item: WishlistItem) => {
    setEditingId(item.id);
    setEditData({ title: item.title, price: String(item.price), link: item.link });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const priceNum = parseFloat(editData.price);
    if (Number.isNaN(priceNum) || priceNum < 0) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("wishlist")
      .update({ title: editData.title, price: priceNum, link: editData.link })
      .eq("id", editingId)
      .select()
      .single();

    if (!error && data) {
      setItems(items.map((i) => (i.id === editingId ? data : i)));
      setEditingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Wishlist
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Things I&apos;d love to own one day — gear, gadgets, and the occasional dream purchase.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search wishlist by title or link..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Stats */}
      {!loading && items.length > 0 && (
        <div className="flex items-center gap-3 mb-8 text-sm text-gray-500 dark:text-gray-400">
          <span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{filteredItems.length}</span>{" "}
            {filteredItems.length === 1 ? "item" : "items"}
          </span>
          <span className="text-gray-300 dark:text-gray-700">•</span>
          <span>
            Total: <span className="font-medium text-gray-700 dark:text-gray-300">{formatPrice(totalPrice)}</span>
          </span>
        </div>
      )}

      {/* Wishlist grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3" />
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-500">
            {search ? "No items match your search." : "Wishlist is empty. Sign in to start adding items!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative">
              {editingId === item.id ? (
                <form onSubmit={handleEdit} className="card p-5 space-y-3">
                  <input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className="input-field text-sm" placeholder="Title" required />
                  <input value={editData.price} onChange={(e) => setEditData({ ...editData, price: e.target.value })} className="input-field text-sm" placeholder="Price" type="number" step="0.01" min="0" required />
                  <input value={editData.link} onChange={(e) => setEditData({ ...editData, link: e.target.value })} className="input-field text-sm" placeholder="Link" type="url" required />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-sm flex-1">Save</button>
                    <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="card-interactive p-5">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white hover:text-accent-600 dark:hover:text-accent-400 transition-colors">
                        {item.title}
                      </h3>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </div>
                    <p className="text-2xl font-bold text-accent-600 dark:text-accent-400 mb-3">
                      {formatPrice(Number(item.price))}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 truncate">
                      {item.link}
                    </p>
                  </a>

                  {user && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(item); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(item.id); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add item section */}
      {user && (
        <div className="mt-8">
          {showForm ? (
            <form onSubmit={handleAdd} className="card p-6 max-w-lg mx-auto space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Add to Wishlist</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Mechanical Keyboard"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (USD)</label>
                <input
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="input-field"
                  placeholder="129.99"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link</label>
                <input
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="input-field"
                  placeholder="https://example.com/product"
                  type="url"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Adding..." : "Add to Wishlist"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add to Wishlist
            </button>
          )}
        </div>
      )}
    </div>
  );
}
