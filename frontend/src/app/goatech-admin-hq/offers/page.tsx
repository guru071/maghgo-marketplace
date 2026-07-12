'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getOffers, createOrUpdateOffer, toggleOffer } from './actions';
import Button from '@/components/ui/Button';

export default function OffersAdminPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getOffers().then(data => {
      setOffers(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const offer = {
      title: formData.get('title'),
      subtitle: formData.get('subtitle'),
      poster_url: formData.get('poster_url') || null,
      is_active: false
    };

    startTransition(async () => {
      await createOrUpdateOffer(offer);
      const data = await getOffers();
      setOffers(data);
      (e.target as HTMLFormElement).reset();
    });
  };

  const handleToggle = (id: number, currentStatus: boolean) => {
    startTransition(async () => {
      await toggleOffer(id, !currentStatus);
      const data = await getOffers();
      setOffers(data);
    });
  };

  if (loading) return <div className="p-8">Loading offers...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Promotional Offers</h1>
        <p className="text-gray-500 mt-2">Create and manage top-bar promotional banners like Diwali Offers.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4">Create New Offer Banner</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Title (e.g. Diwali Mega Sale! 🪔)</label>
            <input name="title" className="w-full border rounded-lg p-2" required />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Subtitle (e.g. Get 50% off...)</label>
            <input name="subtitle" className="w-full border rounded-lg p-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-500 mb-1">Poster Image URL (Optional)</label>
            <input name="poster_url" type="url" placeholder="https://..." className="w-full border rounded-lg p-2" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Create Offer'}</Button>
          </div>
        </form>
      </div>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Saved Offers</h2>
        {offers.length === 0 && <p className="text-gray-500">No offers created yet.</p>}
        {offers.map(offer => (
          <div key={offer.id} className={`p-6 rounded-xl border flex items-center justify-between ${offer.is_active ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900">{offer.title}</h3>
                {offer.is_active && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">Active</span>}
              </div>
              <p className="text-sm text-gray-600">{offer.subtitle}</p>
            </div>
            <Button 
              onClick={() => handleToggle(offer.id, offer.is_active)}
              variant={offer.is_active ? 'secondary' : 'primary'}
              disabled={isPending}
            >
              {offer.is_active ? 'Deactivate' : 'Set as Active'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
