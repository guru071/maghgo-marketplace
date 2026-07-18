'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Product, Merchant } from '@/types';
import Image from 'next/image';

export default function DashboardInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New product form state
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newSpecs, setNewSpecs] = useState<{ label: string; value: string }[]>([]);
  const [newVariants, setNewVariants] = useState<{ name: string; values: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // "Pre-built information": suggest sensible spec labels + option groups based on
  // what kind of product this is, so a shirt prompts for Size/Colour, a phone for
  // Storage, etc. Only fills blanks — never overwrites what the owner has typed.
  const suggestForCategory = () => {
    const c = newCategory.toLowerCase();
    const templates: { match: RegExp; specs: string[]; variants: { name: string; values: string }[] }[] = [
      { match: /shirt|t-?shirt|top|kurta|cloth|apparel|dress|jean|trouser|wear/, specs: ['Material', 'Fit', 'Care'], variants: [{ name: 'Size', values: 'S, M, L, XL' }, { name: 'Colour', values: '' }] },
      { match: /shoe|footwear|sneaker|sandal|slipper|boot/, specs: ['Material', 'Sole'], variants: [{ name: 'Size (UK)', values: '6, 7, 8, 9, 10' }, { name: 'Colour', values: '' }] },
      { match: /phone|mobile|laptop|tablet|electronic|gadget|device/, specs: ['Warranty', 'In the box'], variants: [{ name: 'Storage', values: '64GB, 128GB, 256GB' }, { name: 'Colour', values: '' }] },
      { match: /watch|bag|wallet|belt|accessor|jewel/, specs: ['Material', 'Warranty'], variants: [{ name: 'Colour', values: '' }] },
    ];
    const t = templates.find((x) => x.match.test(c));
    if (!t) return;
    if (newSpecs.length === 0) setNewSpecs(t.specs.map((label) => ({ label, value: '' })));
    if (newVariants.length === 0) setNewVariants(t.variants);
  };
  const categoryHasTemplate = /shirt|t-?shirt|top|kurta|cloth|apparel|dress|jean|trouser|wear|shoe|footwear|sneaker|sandal|slipper|boot|phone|mobile|laptop|tablet|electronic|gadget|device|watch|bag|wallet|belt|accessor|jewel/.test(newCategory.toLowerCase());

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('maghgo_merchant_token');
    if (!token) return;

    try {
      // Use NEXT_PUBLIC_API_URL or fallback to localhost:4000
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const [storeRes, productsRes] = await Promise.all([
        fetch(`${apiUrl}/api/dashboard/store`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/dashboard/products`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (storeRes.ok) setMerchant(await storeRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !newTitle || !newPrice) return alert('Please fill all fields');

    setIsUploading(true);
    const token = localStorage.getItem('maghgo_merchant_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('title', newTitle);
    formData.append('price', newPrice);
    formData.append('description', newDescription);
    formData.append('category', newCategory);
    formData.append('specifications', JSON.stringify(newSpecs.filter((s) => s.label.trim() && s.value.trim())));
    formData.append('variants', JSON.stringify(
      newVariants
        .map((v) => ({ name: v.name.trim(), values: v.values.split(',').map((s) => s.trim()).filter(Boolean) }))
        .filter((v) => v.name && v.values.length > 0)
    ));

    try {
      const res = await fetch(`${apiUrl}/api/dashboard/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTitle('');
        setNewPrice('');
        setNewDescription('');
        setNewCategory('');
        setNewSpecs([]);
        setNewVariants([]);
        setSelectedFile(null);
        fetchDashboardData();
      } else {
        const err = await res.json();
        if (res.status === 402) {
          alert(`${err.error}\n\n${err.message}\n\nPlease go to the Billing tab to upgrade your plan.`);
        } else {
          alert(err.error || 'Failed to upload product');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleFulfillment = async (id: string, current?: string) => {
    const next = current === 'prebook' ? 'buy' : 'prebook';
    const token = localStorage.getItem('maghgo_merchant_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    // Optimistic: flip in the UI, roll back if the request fails.
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, fulfillment_type: next as any } : p)));
    try {
      const res = await fetch(`${apiUrl}/api/dashboard/products/${id}/fulfillment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fulfillment_type: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed');
      }
    } catch (e: any) {
      setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, fulfillment_type: current as any } : p)));
      alert(e.message || 'Could not change the mode.');
    }
  };

  // Save a product's stock. Empty string clears tracking (sell freely).
  const handleUpdateStock = async (id: string, raw: string) => {
    const token = localStorage.getItem('maghgo_merchant_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const value = raw.trim() === '' ? null : Math.max(0, Math.floor(Number(raw)));
    if (raw.trim() !== '' && !Number.isFinite(value as number)) return;
    // Optimistic update.
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, stock: value } : p)));
    try {
      const res = await fetch(`${apiUrl}/api/dashboard/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stock: value }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update stock');
      }
    } catch (e: any) {
      alert(e.message || 'Could not update stock.');
      fetchDashboardData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const token = localStorage.getItem('maghgo_merchant_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      await fetch(`${apiUrl}/api/dashboard/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="text-gray-500">Loading dashboard...</div>;
  if (!merchant) return <div className="text-red-500">Failed to load store profile. Token may be expired.</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Manage your active products on {merchant.store_name}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-accent text-white px-6 py-2.5 rounded-full font-medium hover:bg-black transition-colors shadow-sm"
        >
          + Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {products.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-4xl mb-4">📭</div>
            <p>Your catalog is empty.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Image</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mode</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-16 h-16 relative rounded-lg border border-gray-200 overflow-hidden bg-white">
                      <Image 
                        src={p.processed_image_url || p.original_image_url || ''} 
                        alt={p.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{p.title}</td>
                  <td className="px-6 py-4 text-gray-600">₹{p.price.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min="0"
                      defaultValue={p.stock ?? ''}
                      placeholder="∞"
                      title="Blank = not tracked (always available). 0 = out of stock."
                      onBlur={(e) => {
                        const raw = e.target.value;
                        const current = p.stock ?? '';
                        if (String(raw) !== String(current)) handleUpdateStock(p.id, raw);
                      }}
                      className={`w-20 border rounded-lg px-2 py-1 text-sm focus:ring-accent focus:border-accent ${
                        p.stock === 0 ? 'border-red-300 text-red-600 bg-red-50' : 'border-gray-300 text-gray-700'
                      }`}
                    />
                    {p.stock === 0 && <div className="text-[10px] text-red-500 mt-0.5">Out of stock</div>}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleFulfillment(p.id, p.fulfillment_type)}
                      title="Tap to switch between Buy (delivered) and Pre-book (collect at shop)"
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                        p.fulfillment_type === 'prebook'
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p.fulfillment_type === 'prebook' ? '📅 Pre-book' : '🛒 Buy'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Add New Product</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-accent focus:border-accent"
                  required
                  placeholder="e.g. Red Cotton T-Shirt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input 
                  type="number" 
                  value={newPrice} 
                  onChange={e => setNewPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-accent focus:border-accent"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-accent focus:border-accent"
                  placeholder="e.g. T-Shirt, Footwear, Mobile"
                />
                {categoryHasTemplate && (
                  <button type="button" onClick={suggestForCategory} className="mt-2 text-sm font-medium text-accent hover:underline">
                    ✨ Auto-fill fields for &ldquo;{newCategory}&rdquo;
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 h-20 focus:ring-accent focus:border-accent"
                  placeholder="Tell customers about this product…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specifications <span className="text-gray-400">(optional)</span></label>
                <div className="space-y-2">
                  {newSpecs.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={s.label}
                        onChange={(e) => setNewSpecs((sp) => sp.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                        className="w-1/3 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-accent focus:border-accent"
                        placeholder="Label (e.g. Size)"
                      />
                      <input
                        type="text"
                        value={s.value}
                        onChange={(e) => setNewSpecs((sp) => sp.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-accent focus:border-accent"
                        placeholder="Value (e.g. M, L, XL)"
                      />
                      <button type="button" onClick={() => setNewSpecs((sp) => sp.filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700 px-2" aria-label="Remove specification">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewSpecs((sp) => [...sp, { label: '', value: '' }])}
                    className="text-sm font-medium text-accent hover:underline">+ Add specification</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Options / Variants <span className="text-gray-400">(optional)</span></label>
                <p className="text-xs text-gray-400 mb-2">e.g. Size → S, M, L · Colour → Red, Blue. Customers pick one of each before adding to cart.</p>
                <div className="space-y-2">
                  {newVariants.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => setNewVariants((vs) => vs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                        className="w-1/3 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-accent focus:border-accent"
                        placeholder="Option (e.g. Size)"
                      />
                      <input
                        type="text"
                        value={v.values}
                        onChange={(e) => setNewVariants((vs) => vs.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-accent focus:border-accent"
                        placeholder="Values, comma-separated (e.g. S, M, L)"
                      />
                      <button type="button" onClick={() => setNewVariants((vs) => vs.filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700 px-2" aria-label="Remove option">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setNewVariants((vs) => [...vs, { name: '', values: '' }])}
                    className="text-sm font-medium text-accent hover:underline">+ Add option</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-accent hover:file:bg-gray-100"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">The background will be automatically removed via AI.</p>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2 rounded-full font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="bg-accent text-white px-5 py-2 rounded-full font-medium hover:bg-black disabled:opacity-50"
                >
                  {isUploading ? 'Processing AI Image...' : 'Upload Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
