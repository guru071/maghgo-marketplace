"use client";

import { createContext } from 'react';
import { Product } from '@/types';

/**
 * Shared state for themed (Puck-rendered) storefronts.
 *
 * storeName/storeDescription let theme blocks fall back to the merchant's real
 * identity instead of the "My Store" / "Welcome to my awesome store" defaults —
 * so a seller who never edits the header still shows their own shop name.
 */
export const StoreContext = createContext<{
  products: Product[];
  onAddToCart: (product: Product, opts?: { variant?: string }) => void;
  storeName?: string;
  storeDescription?: string;
} | null>(null);
