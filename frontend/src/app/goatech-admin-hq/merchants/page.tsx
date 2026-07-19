import React from 'react';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import MerchantActions from './MerchantActions';

export const dynamic = 'force-dynamic';

/**
 * The merchants console — full platform-owner control. Uses the SERVICE key
 * (the old version used the anon key, so column restrictions hid most data and
 * there were no actions at all).
 */
export default async function MerchantsPage() {
  const supabase = createAdminSupabaseClient();

  // Explicit columns — never '*', which would pull password hashes and
  // payment secrets into the page payload.
  const { data: merchants, error } = await supabase
    .from('merchants')
    .select('id, phone_number, store_name, store_slug, is_active, subscription_plan, subscription_ends_at, created_at, instagram_handle, products(id)')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error loading merchants: {error.message}</div>;
  }

  const now = new Date();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
        <p className="text-gray-500">Full control: extend subscriptions, change plans, suspend or delete any store.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-600">Store</th>
              <th className="p-4 font-semibold text-gray-600">Plan / Subscription</th>
              <th className="p-4 font-semibold text-gray-600">Products</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {merchants && merchants.length > 0 ? (
              merchants.map((m: any) => {
                const subActive = new Date(m.subscription_ends_at) > now;
                return (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{m.store_name}</div>
                      <a href={`${siteUrl}/${m.store_slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">/{m.store_slug}</a>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {m.phone_number || 'no phone'}{m.instagram_handle ? ` · @${m.instagram_handle}` : ''}
                        <br />joined {new Date(m.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold uppercase tracking-wider">
                        {m.subscription_plan}
                      </span>
                      <div className={`text-xs mt-1 ${subActive ? 'text-emerald-600' : 'text-red-500 font-semibold'}`}>
                        {subActive
                          ? `until ${new Date(m.subscription_ends_at).toLocaleDateString('en-IN')}`
                          : `EXPIRED ${new Date(m.subscription_ends_at).toLocaleDateString('en-IN')}`}
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 font-medium">{m.products?.length ?? 0}</td>
                    <td className="p-4">
                      {m.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold uppercase">Live</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold uppercase">Paused</span>
                      )}
                    </td>
                    <td className="p-4">
                      <MerchantActions merchantId={m.id} storeName={m.store_name} plan={m.subscription_plan} isActive={m.is_active} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">No merchants found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
