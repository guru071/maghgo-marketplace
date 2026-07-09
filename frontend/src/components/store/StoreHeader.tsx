import React from 'react';
import Image from 'next/image';
import { Merchant } from '@/types';

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
        <p className="store-header__description">{merchant.store_description}</p>
      )}
    </header>
  );
}
