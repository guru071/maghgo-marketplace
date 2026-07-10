"use client";

import React from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { config } from "@/puck.config";

// We would normally load this from the database (Supabase)
const initialData = {
  content: [],
  root: {},
};

export default function Editor() {
  // Save handler
  const save = async (data: any) => {
    console.log("Saving layout:", data);
    // Here we would push `data` to Supabase `merchants.theme_config`
    alert("Layout saved! Check your live store.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: "16px", backgroundColor: "#fff", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Maghgo Visual Builder</h1>
          <p style={{ margin: 0, color: "#666", fontSize: "0.875rem" }}>Drag and drop blocks to customize your store.</p>
        </div>
        <a href="../" style={{ padding: "8px 16px", backgroundColor: "#f3f4f6", borderRadius: "6px", textDecoration: "none", color: "#333", fontWeight: "bold" }}>
          Back to Store
        </a>
      </div>
      
      {/* The main visual editor */}
      <Puck config={config} data={initialData} onPublish={save} />
    </div>
  );
}
