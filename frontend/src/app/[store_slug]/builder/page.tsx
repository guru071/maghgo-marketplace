import React from "react";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { BuilderClient } from "./BuilderClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visual Builder | Maghgo",
  robots: "noindex, nofollow", // Keep out of search engines
};

interface BuilderPageProps {
  params: Promise<{
    store_slug: string;
  }>;
}

export default async function BuilderPage({ params }: BuilderPageProps) {
  const { store_slug } = await params;

  if (store_slug === "demo") {
    return <BuilderClient storeSlug={store_slug} initialData={null} />;
  }

  const supabase = createServerSupabaseClient();
  
  const { data: merchant, error } = await supabase
    .from("merchants")
    .select("theme_config, is_active")
    .eq("store_slug", store_slug)
    .single();

  if (error || !merchant || !merchant.is_active) {
    notFound();
  }

  return <BuilderClient storeSlug={store_slug} initialData={merchant.theme_config} />;
}
