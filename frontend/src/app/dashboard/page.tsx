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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

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
        setSelectedFile(null);
        fetchDashboardData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to upload product');
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      setIsUploading(false);
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
