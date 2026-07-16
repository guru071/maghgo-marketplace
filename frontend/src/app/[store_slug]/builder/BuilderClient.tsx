"use client";

import React, { useState } from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { config } from "@/puck.config";
import { StoreContext } from "@/components/store/StoreContext";

interface BuilderClientProps {
  storeSlug: string;
  initialData: any;
}

export function BuilderClient({ storeSlug, initialData }: BuilderClientProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Fallback initial data if none exists in the DB
  const defaultData = {
    content: [],
    root: {},
  };

  const dataToUse = initialData || defaultData;

  const handleSave = async (data: any) => {
    try {
      setIsSaving(true);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("maghgo_merchant_token")
          : null;

      if (!token) {
        alert(
          "Please log in to your dashboard before saving your store layout."
        );
        return;
      }

      // Save via the authenticated backend endpoint. The backend derives the
      // store from the merchant's token, so only the owner can edit their store.
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/dashboard/theme`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme_config: data }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      alert("Layout saved! Check your live store.");
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving layout. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Provide an empty product array so the builder product grid shows placeholders
  const handleAddToCart = () => {
    alert("This is just a preview. Add to cart is disabled in the builder.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: "16px", backgroundColor: "#fff", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Maghgo Visual Builder</h1>
          <p style={{ margin: 0, color: "#666", fontSize: "0.875rem" }}>Drag and drop blocks to customize your store.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {isSaving && <span style={{ color: "#666", fontSize: "14px" }}>Saving...</span>}
          <a href={`/${storeSlug}`} style={{ padding: "8px 16px", backgroundColor: "#f3f4f6", borderRadius: "6px", textDecoration: "none", color: "#333", fontWeight: "bold" }}>
            Back to Store
          </a>
        </div>
      </div>
      
      {/* The main visual editor */}
      <StoreContext.Provider value={{ products: [], onAddToCart: handleAddToCart }}>
        <Puck config={config} data={dataToUse} onPublish={handleSave} />
      </StoreContext.Provider>
    </div>
  );
}
