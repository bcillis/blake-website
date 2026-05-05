"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient, WishlistItem } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { FadeUp, StaggerGrid, StaggerCard } from "@/components/Motion";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);

const hostFromUrl = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
};

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
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("wishlist").select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.title.toLowerCase().includes(q) || i.link.toLowerCase().includes(q));
  }, [items, search]);

  const totalPrice = useMemo(
    () => filteredItems.reduce((sum, i) => sum + Number(i.price || 0), 0),
    [filteredItems]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const priceNum = parseFloat(formData.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setFormError("Please enter a valid price.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("wishlist")
      .insert([{ title: formData.title, price: priceNum, link: formData.link, user_id: user.id }])
      .select()
      .single();
    if (error) {
      setFormError(error.message);
    } else if (data) {
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
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setFormError("Please enter a valid price.");
      return;
    }
    setFormError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("wishlist")
      .update({ title: editData.title, price: priceNum, link: editData.link })
      .eq("id", editingId)
      .select()
      .single();
    if (error) {
      setFormError(error.message);
    } else if (data) {
      setItems(items.map((i) => (i.id === editingId ? data : i)));
      setEditingId(null);
    }
  };

  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      <header className="pt-16 pb-10 max-w-2xl">
        <FadeUp>
          <span className="eyebrow mb-4">Things I&apos;d love to own</span>
        </FadeUp>
        <FadeUp delay={0.05}>
          <h1 className="section-title mb-4">Wishlist.</h1>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="lead">
            Gear, gadgets, and the occasional dream purchase. A running list of
            things on my radar.
          </p>
        </FadeUp>
      </header>

      <FadeUp delay={0.15}>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="text"
            placeholder="Search by title or link"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field sm:flex-1"
          />
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap sm:px-2">
            {String(filteredItems.length).padStart(2, "0")} items · {formatPrice(totalPrice)}
          </span>
          {user && !showForm && (
            <button
              onClick={() => { setFormError(null); setShowForm(true); }}
              className="btn-primary whitespace-nowrap"
            >
              + Add item
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
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">New item</div>
            <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field" placeholder="Title — e.g. Mechanical keyboard" required />
            <input value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="input-field" placeholder="Price (USD) — 129.99" type="number" step="0.01" min="0" required />
            <input value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} className="input-field" placeholder="https://example.com/product" type="url" required />
            {formError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 dark:text-red-300">
                {formError}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Adding..." : "Add"}</button>
              <button type="button" onClick={() => { setFormError(null); setShowForm(false); }} className="btn-secondary">Cancel</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="h-5 skeleton w-2/3 mb-3" />
              <div className="h-6 skeleton w-1/3 mb-2" />
              <div className="h-3 skeleton w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-secondary)]">
            {search ? "No matches." : "Wishlist is empty."}
          </p>
        </div>
      ) : (
        <StaggerGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <StaggerCard key={item.id} className="h-full">
              {editingId === item.id ? (
                <form onSubmit={handleEdit} className="card space-y-3">
                  <input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className="input-field" required />
                  <input value={editData.price} onChange={(e) => setEditData({ ...editData, price: e.target.value })} className="input-field" type="number" step="0.01" min="0" required />
                  <input value={editData.link} onChange={(e) => setEditData({ ...editData, link: e.target.value })} className="input-field" type="url" required />
                  {formError && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 dark:text-red-300">
                      {formError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary">Save</button>
                    <button type="button" onClick={() => { setFormError(null); setEditingId(null); }} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              ) : (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-interactive group block h-full"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-serif text-lg text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                      {item.title}
                    </h3>
                    <span className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                      ↗
                    </span>
                  </div>
                  <div className="font-serif text-3xl text-[var(--accent)] mb-3 tabular-nums">
                    {formatPrice(Number(item.price))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="chip">{hostFromUrl(item.link)}</span>
                    {user && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(item); }}
                          className="btn-ghost text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(item.id); }}
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
