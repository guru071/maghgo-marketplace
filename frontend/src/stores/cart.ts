'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem } from '@/types';

interface CartState {
  // Store items keyed by storeSlug
  carts: Record<string, CartItem[]>;
  isOpen: boolean;

  // Actions
  addItem: (storeSlug: string, item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (storeSlug: string, id: string) => void;
  updateQuantity: (storeSlug: string, id: string, quantity: number) => void;
  clearCart: (storeSlug: string) => void;

  // Drawer
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Computed - requires storeSlug
  getTotal: (storeSlug: string) => number;
  getItemCount: (storeSlug: string) => number;
  getItems: (storeSlug: string) => CartItem[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      carts: {},
      isOpen: false,

      addItem: (storeSlug, newItem) => {
        set((state) => {
          const storeItems = state.carts[storeSlug] || [];
          const existing = storeItems.find((item) => item.id === newItem.id);
          
          let newStoreItems;
          if (existing) {
            newStoreItems = storeItems.map((item) =>
              item.id === newItem.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          } else {
            newStoreItems = [...storeItems, { ...newItem, quantity: 1 }];
          }

          return { carts: { ...state.carts, [storeSlug]: newStoreItems } };
        });
      },

      removeItem: (storeSlug, id) => {
        set((state) => {
          const storeItems = state.carts[storeSlug] || [];
          return {
            carts: {
              ...state.carts,
              [storeSlug]: storeItems.filter((item) => item.id !== id),
            },
          };
        });
      },

      updateQuantity: (storeSlug, id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(storeSlug, id);
          return;
        }
        set((state) => {
          const storeItems = state.carts[storeSlug] || [];
          return {
            carts: {
              ...state.carts,
              [storeSlug]: storeItems.map((item) =>
                item.id === id ? { ...item, quantity } : item
              ),
            },
          };
        });
      },

      clearCart: (storeSlug) => set((state) => ({ 
        carts: { ...state.carts, [storeSlug]: [] } 
      })),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getItems: (storeSlug) => {
        return get().carts[storeSlug] || [];
      },

      getTotal: (storeSlug) => {
        const storeItems = get().carts[storeSlug] || [];
        return storeItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },

      getItemCount: (storeSlug) => {
        const storeItems = get().carts[storeSlug] || [];
        return storeItems.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'maghgo-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ carts: state.carts }),
    }
  )
);
