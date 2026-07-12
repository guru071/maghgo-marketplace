import React from 'react';
import Image from 'next/image';
import { Merchant } from '@/types';
import { Camera, MessageSquare, Hash } from 'lucide-react';

interface StoreHeaderProps {
  merchant: Merchant;
}

export default function StoreHeader({ merchant }: StoreHeaderProps) {
  return (
    <header className="store-header">
      {merchant.store_logo_url && (
        <Image
          src={merchant.store_logo_url}
          alt={`${merchant.store_name} logo`}
          width={72}
          height={72}
          className="store-header__logo"
          priority
        />
      )}
      <h1 className="store-header__title">{merchant.store_name}</h1>
      {merchant.store_description && (
        <p className="store-header__description mb-4">{merchant.store_description}</p>
      )}

      {/* Social Links */}
      {(merchant.instagram_handle || merchant.facebook_url || merchant.x_handle) && (
        <div className="flex items-center justify-center gap-4 mt-4">
          {merchant.instagram_handle && (
            <a 
              href={`https://instagram.com/${merchant.instagram_handle.replace('@', '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-pink-600 transition-colors"
              aria-label="Instagram"
            >
              <Camera className="w-5 h-5" />
            </a>
          )}
          {merchant.facebook_url && (
            <a 
              href={merchant.facebook_url.startsWith('http') ? merchant.facebook_url : `https://facebook.com/${merchant.facebook_url}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-600 transition-colors"
              aria-label="Facebook"
            >
              <MessageSquare className="w-5 h-5" />
            </a>
          )}
          {merchant.x_handle && (
            <a 
              href={`https://x.com/${merchant.x_handle.replace('@', '')}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-900 transition-colors"
              aria-label="X (Twitter)"
            >
              <Hash className="w-5 h-5" />
            </a>
          )}
        </div>
      )}
    </header>
  );
}
