'use client';

import React from 'react';
import { Merchant, Product } from '@/types';
import StoreHeader from '@/components/store/StoreHeader';
import ProductGrid from '@/components/store/ProductGrid';
import CartDrawer from '@/components/store/CartDrawer';
import FloatingCartButton from '@/components/store/FloatingCartButton';
import { useCartStore } from '@/stores/cart';
import EmptyStore from '@/components/store/EmptyStore';
import StoreContact from '@/components/store/StoreContact';
import AnimatedBg from '@/components/store/AnimatedBg';

interface StoreClientProps {
  merchant: Merchant;
  products: Product[];
}

import { Render } from "@puckeditor/core";
import { config } from "@/puck.config";

import { StoreContext } from '@/components/store/StoreContext';
import { showsPoweredByFooter } from '@/lib/plans';

export function StoreClient({ merchant, products }: StoreClientProps) {
  const { addItem } = useCartStore();
  const [activeTheme, setActiveTheme] = React.useState<any>(() => {
    const dbTheme = merchant.theme_config as any;
    if (!dbTheme) return null;
    if (dbTheme.content) return dbTheme;
    // Legacy support for raw color configs
    return {
      content: [
        {
          type: "StoreHeader",
          props: {
            title: merchant.store_name || "My Store",
            subtitle: merchant.store_description || "",
            bgColor: dbTheme.colors?.primary || "#ffffff",
            textColor: dbTheme.colors?.background || "#111111"
          }
        },
        {
          type: "ProductGrid",
          props: {
            columns: 3,
            showPrices: true,
            gap: dbTheme.layout?.spacing || "24px",
            cardBg: dbTheme.colors?.background || "#ffffff"
          }
        }
      ],
      root: { props: { title: merchant.store_name || "Store" } }
    };
  });

  React.useEffect(() => {
    // Listen for live theme previews from the dashboard iframe parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MAGHGO_PREVIEW_THEME') {
        setActiveTheme(event.data.theme);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleAddToCart = (product: Product, opts?: { variant?: string }) => {
    const variant = opts?.variant;
    addItem(merchant.store_slug, {
      // A chosen variant makes a distinct cart line, so the same shirt in two
      // sizes doesn't merge. The real product id is kept for ordering.
      id: variant ? `${product.id}::${variant}` : product.id,
      productId: product.id,
      title: variant ? `${product.title} (${variant})` : product.title,
      price: product.price,
      currency: product.currency,
      image_url: product.processed_image_url || product.original_image_url,
      fulfillment_type: product.fulfillment_type,
      variant,
    });
  };

  if (!products || products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {activeTheme ? (
          <StoreContext.Provider value={{ products: [], onAddToCart: handleAddToCart, storeName: merchant.store_name, storeDescription: merchant.store_description }}>
            <Render config={config} data={activeTheme} />
          </StoreContext.Provider>
        ) : (
          <StoreHeader merchant={merchant} />
        )}
        <EmptyStore />
      </div>
    );
  }

  // A theme's canvas colour must reach the page itself. Without this, a dark
  // palette painted its light text onto the default light background and the
  // headings were unreadable.
  const themeBg = activeTheme?.root?.props?.background;

  // The theme's accent must also reach surfaces rendered OUTSIDE the Puck
  // canvas — the floating cart button, cart drawer CTAs, and the product
  // details sheet all colour themselves with var(--accent). Without this
  // override they kept the default orange on every theme.
  const themeAccent = activeTheme?.content?.find?.((b: any) => b?.type === 'ProductGrid')?.props?.accent;

  // Optional animated background layer (orbs / aurora / particles) declared by
  // the theme. Rendered behind everything; content sits on a z-indexed layer.
  const themeEffect = activeTheme?.root?.props?.bgEffect as
    | 'orbs' | 'aurora' | 'particles' | undefined;

  return (
    <div
      className={`min-h-screen pb-24 ${themeBg ? '' : 'bg-gray-50'}`}
      style={{
        // `background` (not backgroundColor) so themes can use CSS gradients.
        ...(themeBg ? { background: themeBg } : {}),
        ...(themeAccent ? ({ '--accent': themeAccent } as React.CSSProperties) : {}),
        position: 'relative',
      }}
    >
      {themeEffect && <AnimatedBg effect={themeEffect} accent={themeAccent} />}
      <div style={{ position: 'relative', zIndex: 1 }}>
      {activeTheme ? (
        <StoreContext.Provider value={{ products, onAddToCart: handleAddToCart, storeName: merchant.store_name, storeDescription: merchant.store_description }}>
          <Render config={config} data={activeTheme} />
        </StoreContext.Provider>
      ) : (
        <>
          <StoreHeader merchant={merchant} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
            <ProductGrid products={products} onAddToCart={handleAddToCart} />
          </main>
        </>
      )}
      
      <StoreContact merchant={merchant} />

      {/* Gated through the shared helper: this list was previously hardcoded here
          and omitted `business`, so Business merchants paid for white-label and
          still shipped our footer. */}
      {showsPoweredByFooter(merchant.subscription_plan) && (
        <footer className="w-full py-6 mt-12 text-center border-t border-gray-200">
          <p className="text-gray-500 text-sm">
            Powered by <a href="https://goatech.tech" target="_blank" rel="noopener noreferrer" className="font-bold text-gray-800 hover:text-accent transition-colors">GOAT'ECH</a>
          </p>
        </footer>
      )}

      <CartDrawer storeName={merchant.store_name} phone={merchant.phone_number} instagramHandle={merchant.instagram_handle} />
      <FloatingCartButton />
      </div>
    </div>
  );
}
