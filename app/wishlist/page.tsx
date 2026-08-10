"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient, WishlistItem } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(price);

/** Bare domain, shown under the title so you can see where it's from. */
const hostFromUrl = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
};

type SortKey = "date" | "alpha" | "price";

const sortLabels: Record<SortKey, string> = {
  date: "Newest first",
  alpha: "A → Z",
  price: "Price (high → low)",
};

export default function WishlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
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
      (i) => i.title.toLowerCase().includes(q) || i.link.toLowerCase().includes(q)
    );
  }, [items, search]);

  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    switch (sortKey) {
      case "alpha":
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      case "price":
        return arr.sort((a, b) => Number(b.price) - Number(a.price));
      case "date":
      default:
        return arr.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }, [filteredItems, sortKey]);

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
    const { error } = await supabase.from("wishlist").delete().eq("id", id);
    if (error) {
      setFormError(`Couldn't delete: ${error.message}`);
      return;
    }
    setFormError(null);
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
      <header className="pt-16 pb-10">
        <p className="meta mb-5">On my radar</p>
        <h1 className="page-title mb-5">Wishlist.</h1>
        <p className="lead">Gear and gadgets I&apos;d like to own, with prices in CAD.</p>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4">
        <label htmlFor="wish-search" className="sr-only">
          Search wishlist
        </label>
        <input
          id="wish-search"
          type="search"
          placeholder="Search title or link"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field sm:max-w-xs"
        />
        <label htmlFor="wish-sort" className="sr-only">
          Sort by
        </label>
        <select
          id="wish-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="field sm:w-56 cursor-pointer"
        >
          {(Object.keys(sortLabels) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {sortLabels[key]}
            </option>
          ))}
        </select>
        {user && !showForm && (
          <button
            onClick={() => {
              setFormError(null);
              setShowForm(true);
            }}
            className="btn-quiet whitespace-nowrap sm:ml-auto"
          >
            Add item
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
              <p className="meta">New item</p>
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="field"
                placeholder="Title"
                required
              />
              <input
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="field"
                placeholder="Price (CAD)"
                type="number"
                step="0.01"
                min="0"
                required
              />
              <input
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="field"
                placeholder="https://example.com/product"
                type="url"
                required
              />
              {formError && (
                <div role="alert" className="alert">
                  {formError}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={submitting} className="btn">
                  {submitting ? "Adding…" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setShowForm(false);
                  }}
                  className="btn-quiet"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete failures happen with no form open, so they need their own slot. */}
      {formError && !showForm && !editingId && (
        <div role="alert" className="alert mb-6">
          {formError}
        </div>
      )}

      {loading ? (
        <div className="index" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="index-row">
              <div className="h-5 skeleton w-1/3" />
            </div>
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="index">
          <p className="py-16 text-[var(--ink-3)]">
            {search ? `Nothing matches “${search}”.` : "Wishlist is empty."}
          </p>
        </div>
      ) : (
        <>
          <ul className="index">
            {sortedItems.map((item) => (
              <li key={item.id}>
                {editingId === item.id ? (
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
                    <input
                      value={editData.price}
                      onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                      className="field"
                      aria-label="Price in CAD"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                    />
                    <input
                      value={editData.link}
                      onChange={(e) => setEditData({ ...editData, link: e.target.value })}
                      className="field"
                      aria-label="Link"
                      type="url"
                      required
                    />
                    {formError && (
                      <div role="alert" className="alert">
                        {formError}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="btn">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormError(null);
                          setEditingId(null);
                        }}
                        className="btn-quiet"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <article className="index-row group grid-cols-[1fr_auto] items-baseline">
                    <div className="min-w-0">
                      <h2 className="row-title">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="stretched-link"
                        >
                          {item.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </h2>
                      <p className="data mt-0.5 text-[var(--ink-3)]">{hostFromUrl(item.link)}</p>
                      {user && (
                        <div className="row-actions mt-2.5 flex items-center gap-4">
                          <button onClick={() => startEdit(item)} className="btn-bare">
                            Edit<span className="sr-only"> {item.title}</span>
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="btn-bare">
                            Delete<span className="sr-only"> {item.title}</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Tabular figures so the column of prices aligns digit for digit. */}
                    <span className="font-mono text-base tabular-nums text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                      {formatPrice(Number(item.price))}
                    </span>
                  </article>
                )}
              </li>
            ))}
          </ul>

          {/* Ledger total */}
          <div className="flex items-baseline justify-between gap-4 pt-4 border-t border-[var(--rule-strong)]">
            <span className="meta">
              {String(filteredItems.length).padStart(2, "0")}
              {search ? ` of ${items.length}` : ""} items
            </span>
            <span className="font-mono text-base tabular-nums text-[var(--ink)]">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
