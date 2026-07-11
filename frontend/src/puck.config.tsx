import React from "react";
import type { Config } from "@puckeditor/core";
import { DropZone } from "@puckeditor/core";
import { StoreContext } from "@/components/store/StoreContext";

export type Props = {
  // Layouts
  Section: { bgColor: string; bgImage?: string; paddingTop: string; paddingBottom: string; alignItems: "flex-start" | "center" | "flex-end" | "stretch" };
  Columns: { distribution: "1fr 1fr" | "1fr 1fr 1fr" | "1fr 1fr 1fr 1fr" | "1fr 2fr" | "2fr 1fr"; gap: string };
  
  // Content
  Heading: { text: string; size: string; color: string; align: "left" | "center" | "right" };
  Text: { text: string; color: string; align: "left" | "center" | "right" };
  Button: { text: string; url: string; variant: "primary" | "secondary" | "outline"; align: "left" | "center" | "right" };
  Image: { url: string; alt: string; objectFit: "cover" | "contain"; height: string; borderRadius: string };
  Spacer: { height: string };
  Divider: { color: string; margin: string };
  
  // Advanced
  FeatureGrid: { features: { title: string; description: string; icon: string }[] };
  Testimonials: { testimonials: { name: string; review: string; rating: number }[] };
  
  // E-commerce
  StoreHeader: { title: string; subtitle: string; logoUrl?: string; bgImage?: string; bgColor: string; textColor: string };
  ProductGrid: { columns: number; showPrices: boolean; cardBg: string; gap: string };
  Banner: { imageUrl: string; text: string; linkUrl: string; textColor: string; height: string };
};

export const config: Config<Props> = {
  components: {
    // ---------------------------------------------------------
    // LAYOUT BLOCKS
    // ---------------------------------------------------------
    Section: {
      fields: {
        bgColor: { type: "text" },
        bgImage: { type: "text" },
        paddingTop: { type: "text" },
        paddingBottom: { type: "text" },
        alignItems: {
          type: "radio",
          options: [
            { label: "Top", value: "flex-start" },
            { label: "Center", value: "center" },
            { label: "Bottom", value: "flex-end" },
            { label: "Stretch", value: "stretch" },
          ],
        },
      },
      defaultProps: {
        bgColor: "transparent",
        paddingTop: "64px",
        paddingBottom: "64px",
        alignItems: "center",
      },
      render: ({ bgColor, bgImage, paddingTop, paddingBottom, alignItems }) => {
        return (
          <div style={{
            backgroundColor: bgColor,
            backgroundImage: bgImage ? `url(${bgImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            paddingTop,
            paddingBottom,
            width: "100%",
          }}>
            <div style={{
              maxWidth: "1200px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              alignItems,
              width: "100%",
              padding: "0 24px"
            }}>
              <DropZone zone="content" />
            </div>
          </div>
        );
      },
    },
    Columns: {
      fields: {
        distribution: {
          type: "select",
          options: [
            { label: "2 Columns (Equal)", value: "1fr 1fr" },
            { label: "3 Columns (Equal)", value: "1fr 1fr 1fr" },
            { label: "4 Columns (Equal)", value: "1fr 1fr 1fr 1fr" },
            { label: "Left Heavy (2:1)", value: "2fr 1fr" },
            { label: "Right Heavy (1:2)", value: "1fr 2fr" },
          ]
        },
        gap: { type: "text" },
      },
      defaultProps: {
        distribution: "1fr 1fr",
        gap: "24px",
      },
      render: ({ distribution, gap }) => {
        const cols = distribution.split(" ").length;
        return (
          <div style={{
            display: "grid",
            gridTemplateColumns: distribution,
            gap: gap,
            width: "100%",
          }}>
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} style={{ width: "100%" }}>
                <DropZone zone={`col-${i}`} />
              </div>
            ))}
          </div>
        );
      },
    },
    
    // ---------------------------------------------------------
    // CONTENT BLOCKS
    // ---------------------------------------------------------
    Heading: {
      fields: {
        text: { type: "text" },
        size: { type: "text" },
        color: { type: "text" },
        align: {
          type: "radio",
          options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]
        }
      },
      defaultProps: {
        text: "Heading Title",
        size: "32px",
        color: "#1A1A2E",
        align: "left",
      },
      render: ({ text, size, color, align }) => (
        <h2 style={{ margin: "0 0 16px 0", fontSize: size, color, textAlign: align, fontWeight: "bold" }}>
          {text}
        </h2>
      ),
    },
    Text: {
      fields: {
        text: { type: "textarea" },
        color: { type: "text" },
        align: {
          type: "radio",
          options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]
        }
      },
      defaultProps: {
        text: "Enter your text here...",
        color: "#4B5563",
        align: "left",
      },
      render: ({ text, color, align }) => (
        <p style={{ margin: "0 0 16px 0", fontSize: "16px", lineHeight: "1.6", color, textAlign: align, whiteSpace: "pre-wrap" }}>
          {text}
        </p>
      ),
    },
    Button: {
      fields: {
        text: { type: "text" },
        url: { type: "text" },
        variant: {
          type: "radio",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
            { label: "Outline", value: "outline" }
          ]
        },
        align: {
          type: "radio",
          options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]
        }
      },
      defaultProps: {
        text: "Click Me",
        url: "#",
        variant: "primary",
        align: "left",
      },
      render: ({ text, url, variant, align }) => {
        let bg = "#E07A5F";
        let color = "#FFF";
        let border = "none";
        
        if (variant === "secondary") {
          bg = "#1A1A2E";
        } else if (variant === "outline") {
          bg = "transparent";
          color = "#1A1A2E";
          border = "2px solid #1A1A2E";
        }
        
        return (
          <div style={{ textAlign: align, marginBottom: "16px" }}>
            <a href={url} style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: bg,
              color,
              border,
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              transition: "opacity 0.2s"
            }}>
              {text}
            </a>
          </div>
        );
      }
    },
    Image: {
      fields: {
        url: { type: "text" },
        alt: { type: "text" },
        height: { type: "text" },
        borderRadius: { type: "text" },
        objectFit: {
          type: "radio",
          options: [{ label: "Cover", value: "cover" }, { label: "Contain", value: "contain" }]
        }
      },
      defaultProps: {
        url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
        alt: "Image",
        height: "auto",
        borderRadius: "8px",
        objectFit: "cover"
      },
      render: ({ url, alt, height, borderRadius, objectFit }) => (
        <div style={{ marginBottom: "16px", width: "100%" }}>
          <img src={url} alt={alt} style={{ width: "100%", height, borderRadius, objectFit, display: "block" }} />
        </div>
      )
    },
    Spacer: {
      fields: {
        height: { type: "text" }
      },
      defaultProps: { height: "32px" },
      render: ({ height }) => <div style={{ height, width: "100%" }} />
    },
    Divider: {
      fields: {
        color: { type: "text" },
        margin: { type: "text" }
      },
      defaultProps: { color: "#E5E7EB", margin: "32px 0" },
      render: ({ color, margin }) => <hr style={{ border: "none", borderTop: `1px solid ${color}`, margin, width: "100%" }} />
    },

    // ---------------------------------------------------------
    // ADVANCED SECTIONS
    // ---------------------------------------------------------
    FeatureGrid: {
      fields: {
        features: {
          type: "array",
          arrayFields: {
            title: { type: "text" },
            description: { type: "text" },
            icon: { type: "text" },
          },
          getItemSummary: (item) => item.title || "Feature",
        }
      },
      defaultProps: {
        features: [
          { title: "Free Shipping", description: "On orders over ₹500", icon: "🚚" },
          { title: "24/7 Support", description: "Contact us anytime", icon: "💬" },
          { title: "Secure Payments", description: "100% safe transactions", icon: "🔒" },
        ]
      },
      render: ({ features }) => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px", width: "100%", padding: "24px 0" }}>
          {features.map((f, i) => (
            <div key={i} style={{ textAlign: "center", padding: "24px", backgroundColor: "#f9fafb", borderRadius: "12px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px", color: "#1A1A2E" }}>{f.title}</h3>
              <p style={{ color: "#6B7280", margin: 0 }}>{f.description}</p>
            </div>
          ))}
        </div>
      )
    },
    Testimonials: {
      fields: {
        testimonials: {
          type: "array",
          arrayFields: {
            name: { type: "text" },
            review: { type: "textarea" },
            rating: { type: "number" },
          },
          getItemSummary: (item) => item.name || "Review",
        }
      },
      defaultProps: {
        testimonials: [
          { name: "Rahul S.", review: "Amazing quality products. Very fast delivery through WhatsApp!", rating: 5 },
          { name: "Priya M.", review: "Love the collection. Customer service is top notch.", rating: 5 },
        ]
      },
      render: ({ testimonials }) => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", width: "100%", padding: "24px 0" }}>
          {testimonials.map((t, i) => (
            <div key={i} style={{ padding: "24px", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
              <div style={{ color: "#FBBF24", marginBottom: "12px", fontSize: "20px" }}>
                {"★".repeat(Math.min(5, Math.max(1, t.rating)))}{"☆".repeat(5 - Math.min(5, Math.max(1, t.rating)))}
              </div>
              <p style={{ color: "#374151", fontSize: "16px", fontStyle: "italic", marginBottom: "16px" }}>"{t.review}"</p>
              <p style={{ fontWeight: "bold", color: "#111827", margin: 0 }}>- {t.name}</p>
            </div>
          ))}
        </div>
      )
    },

    // ---------------------------------------------------------
    // E-COMMERCE BLOCKS
    // ---------------------------------------------------------
    StoreHeader: {
      fields: {
        title: { type: "text" },
        subtitle: { type: "text" },
        logoUrl: { type: "text" },
        bgImage: { type: "text" },
        bgColor: { type: "text" },
        textColor: { type: "text" },
      },
      defaultProps: {
        title: "My Store",
        subtitle: "Welcome to my awesome store",
        bgColor: "#ffffff",
        textColor: "#1A1A2E",
      },
      render: ({ title, subtitle, logoUrl, bgImage, bgColor, textColor }) => (
        <div style={{
          padding: "4rem 2rem",
          textAlign: "center",
          backgroundColor: bgColor,
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: bgImage ? "#fff" : textColor,
          borderBottom: "1px solid #eee",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%"
        }}>
          {logoUrl && <img src={logoUrl} alt={title} style={{ height: "80px", width: "auto", marginBottom: "1.5rem", borderRadius: "8px" }} />}
          <h1 style={{ fontSize: "3rem", fontWeight: "bold", margin: "0 0 1rem 0" }}>{title}</h1>
          <p style={{ fontSize: "1.2rem", margin: 0, opacity: 0.9 }}>{subtitle}</p>
        </div>
      ),
    },
    ProductGrid: {
      fields: {
        columns: {
          type: "radio",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
            { label: "4", value: 4 },
          ],
        },
        gap: { type: "text" },
        cardBg: { type: "text" },
        showPrices: { type: "radio", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
      },
      defaultProps: {
        columns: 3,
        gap: "24px",
        cardBg: "#ffffff",
        showPrices: true,
      },
      render: ({ columns, showPrices, cardBg, gap }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const storeCtx = React.useContext(StoreContext);
        const hasLiveProducts = storeCtx && storeCtx.products.length > 0;

        return (
          <div style={{ padding: "2rem 0", width: "100%" }}>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: `repeat(auto-fill, minmax(${columns === 4 ? '200px' : columns === 3 ? '250px' : '300px'}, 1fr))`, 
              gap: gap 
            }}>
              {hasLiveProducts ? (
                // Render Live Products
                storeCtx.products.map((p: any) => (
                  <div key={p.id} style={{ backgroundColor: cardBg, border: "1px solid #eee", borderRadius: "12px", padding: "16px", display: 'flex', flexDirection: 'column', transition: "transform 0.2s", cursor: "pointer" }}>
                    <div style={{ width: "100%", aspectRatio: "1", backgroundImage: `url(${p.processed_image_url || p.original_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: "8px", marginBottom: "16px" }} />
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", fontWeight: "600", color: "#1A1A2E" }}>{p.title}</h3>
                    {showPrices && <span style={{ fontWeight: "700", color: "#E07A5F", fontSize: "1.2rem", marginBottom: "16px" }}>{p.currency}{p.price}</span>}
                    <button 
                      onClick={() => storeCtx.onAddToCart(p)}
                      style={{ marginTop: 'auto', backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: "100%" }}
                    >
                      Add to Cart
                    </button>
                  </div>
                ))
              ) : (
                // Render Placeholders for Builder
                [1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ backgroundColor: cardBg, border: "1px solid #eee", borderRadius: "12px", padding: "16px", display: 'flex', flexDirection: 'column' }}>
                    <div style={{ width: "100%", aspectRatio: "1", backgroundColor: "#f3f4f6", borderRadius: "8px", marginBottom: "16px" }} />
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", color: "#1A1A2E", fontWeight: "600" }}>Sample Product {i}</h3>
                    {showPrices && <span style={{ fontWeight: "700", color: "#E07A5F", fontSize: "1.2rem", marginBottom: "16px" }}>₹999</span>}
                    <button style={{ marginTop: 'auto', backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'not-allowed', fontWeight: 'bold', width: "100%" }}>
                      Add to Cart
                    </button>
                  </div>
                ))
              )}
            </div>
            {!hasLiveProducts && (
              <p style={{ textAlign: 'center', color: '#9CA3AF', margin: '2rem 0 0', fontStyle: 'italic' }}>
                * Your live products will automatically populate this grid.
              </p>
            )}
          </div>
        );
      },
    },
    Banner: {
      fields: {
        imageUrl: { type: "text" },
        text: { type: "text" },
        linkUrl: { type: "text" },
        textColor: { type: "text" },
        height: { type: "text" },
      },
      defaultProps: {
        imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
        text: "Summer Sale! 50% Off Everything",
        linkUrl: "#",
        textColor: "#ffffff",
        height: "400px",
      },
      render: ({ imageUrl, text, linkUrl, textColor, height }) => (
        <a href={linkUrl} style={{ display: 'block', textDecoration: 'none', width: "100%" }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: height,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: "12px",
            overflow: "hidden"
          }}>
            <div style={{
              position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)'
            }} />
            <h2 style={{
              position: 'relative',
              color: textColor,
              fontSize: '3rem',
              fontWeight: 'bold',
              textAlign: 'center',
              textShadow: '0 4px 6px rgba(0,0,0,0.5)',
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
