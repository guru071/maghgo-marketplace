import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const revalidate = 0; // Always fetch fresh data for admin

export default async function MerchantsPage() {
  const supabase = createServerSupabaseClient();
  
  // Explicit columns — never '*', which would pull every merchant's
  // password_hash into the admin page payload.
  const { data: merchants, error } = await supabase
    .from('merchants')
    .select('id, phone_number, store_name, store_slug, store_description, is_active, subscription_plan, subscription_ends_at, created_at, instagram_handle')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error loading merchants: {error.message}</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
          <p className="text-gray-500">Manage all registered stores on the platform.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-600">Store Name</th>
              <th className="p-4 font-semibold text-gray-600">Slug</th>
              <th className="p-4 font-semibold text-gray-600">Plan</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Joined</th>
            </tr>
          </thead>
          <tbody>
            {merchants && merchants.length > 0 ? (
              merchants.map((merchant) => (
                <tr key={merchant.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{merchant.store_name}</div>
                    <div className="text-sm text-gray-500">{merchant.phone_number}</div>
                  </td>
                  <td className="p-4 text-gray-600">/{merchant.store_slug}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold uppercase tracking-wider">
                      {merchant.subscription_plan}
                    </span>
                  </td>
                  <td className="p-4">
                    {merchant.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold uppercase tracking-wider">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold uppercase tracking-wider">Inactive</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500 text-sm">
                    {new Date(merchant.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No merchants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
