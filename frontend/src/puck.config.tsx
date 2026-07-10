import React from "react";
import type { Config } from "@puckeditor/core";

// Define the shape of our blocks
export type Props = {
  StoreHeader: { title: string; subtitle: string; bgImage?: string; bgColor: string };
  ProductGrid: { columns: number; showPrices: boolean };
  Banner: { imageUrl: string; text: string; linkUrl: string; textColor: string };
};

export const config: Config<Props> = {
  components: {
    StoreHeader: {
      fields: {
        title: { type: "text" },
        subtitle: { type: "text" },
        bgImage: { type: "text" },
        bgColor: { type: "text" },
      },
      defaultProps: {
        title: "My Store",
        subtitle: "Welcome to my awesome store",
        bgColor: "#ffffff",
      },
      render: ({ title, subtitle, bgImage, bgColor }) => (
        <div style={{
          padding: "4rem 2rem",
          textAlign: "center",
          backgroundColor: bgColor,
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: bgImage ? "#fff" : "inherit",
          borderBottom: "1px solid #eee"
        }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", margin: "0 0 1rem 0" }}>{title}</h1>
          <p style={{ fontSize: "1.2rem", margin: 0 }}>{subtitle}</p>
        </div>
      ),
    },
    ProductGrid: {
      fields: {
        columns: {
          type: "radio",
          options: [
            { label: "2 Columns", value: 2 },
            { label: "3 Columns", value: 3 },
            { label: "4 Columns", value: 4 },
          ],
        },
        showPrices: { type: "radio", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
      },
      defaultProps: {
        columns: 3,
        showPrices: true,
      },
      render: ({ columns, showPrices }) => (
        <div style={{ padding: "2rem" }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: `repeat(${columns}, 1fr)`, 
            gap: "1.5rem" 
          }}>
            {/* Placeholder Products for Builder */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ border: "1px solid #eee", borderRadius: "8px", padding: "1rem" }}>
                <div style={{ width: "100%", aspectRatio: "1", backgroundColor: "#f3f4f6", borderRadius: "4px", marginBottom: "1rem" }} />
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>Product Title {i}</h3>
                {showPrices && <span style={{ fontWeight: "bold", color: "#E07A5F" }}>₹999</span>}
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: '#666', margin: '2rem 0 0', fontStyle: 'italic' }}>
            Note: Live products will automatically load here from your WhatsApp.
          </p>
        </div>
      ),
    },
    Banner: {
      fields: {
        imageUrl: { type: "text" },
        text: { type: "text" },
        linkUrl: { type: "text" },
        textColor: { type: "text" },
      },
      defaultProps: {
        imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
        text: "Summer Sale! 50% Off Everything",
        linkUrl: "#",
        textColor: "#ffffff",
      },
      render: ({ imageUrl, text, linkUrl, textColor }) => (
        <a href={linkUrl} style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '300px',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)'
            }} />
            <h2 style={{
              position: 'relative',
              color: textColor,
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              margin: 0,
              padding: '0 2rem'
            }}>
              {text}
            </h2>
          </div>
        </a>
      ),
    }
  },
};
