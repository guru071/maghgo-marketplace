import React from 'react';
import { Merchant } from '@/types';

/**
 * Contact & location block for the storefront.
 *
 * The "Get directions" button is a plain Google Maps *search URL* — a normal
 * hyperlink, no Maps API or API key involved. Contacts reuse fields the
 * merchant already has (phone, Instagram, Facebook, X). Renders nothing if the
 * store has neither an address nor any contact, so it never shows an empty box.
 */
export default function StoreContact({ merchant }: { merchant: Merchant }) {
  const address = (merchant as any).store_address as string | undefined;
  const phone = merchant.phone_number;
  const ig = merchant.instagram_handle?.replace('@', '');
  const fb = merchant.facebook_url;
  const x = merchant.x_handle?.replace('@', '');

  const hasContact = phone || ig || fb || x;
  if (!address && !hasContact) return null;

  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
          <span>📍</span> Visit &amp; Contact
        </h2>

        {address && (
          <div className="mb-5">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Address</div>
            <p className="text-gray-700 whitespace-pre-line">{address}</p>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
              >
                🧭 Get directions
              </a>
            )}
          </div>
        )}

        {hasContact && (
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Reach us</div>
            <div className="flex flex-wrap gap-2">
              {phone && (
                <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white bg-[#25D366] hover:bg-[#1DA851] px-4 py-2 rounded-lg transition-colors">
                  WhatsApp
                </a>
              )}
              {phone && (
                <a href={`tel:+${phone}`} className="text-sm font-medium text-gray-800 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors">
                  Call
                </a>
              )}
              {ig && (
                <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] hover:opacity-90 px-4 py-2 rounded-lg transition-opacity">
                  Instagram
                </a>
              )}
              {fb && (
                <a href={fb.startsWith('http') ? fb : `https://facebook.com/${fb}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white bg-[#0084FF] hover:bg-[#0073E6] px-4 py-2 rounded-lg transition-colors">
                  Facebook
                </a>
              )}
              {x && (
                <a href={`https://x.com/${x}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white bg-black hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors">
                  X
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
