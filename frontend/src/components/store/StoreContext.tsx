"use client";

import { createContext } from 'react';
import { Product } from '@/types';

export const StoreContext = createContext<{
  products: Product[];
  onAddToCart: (product: Product) => void;
} | null>(null);
