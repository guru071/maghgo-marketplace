// ─── WhatsApp Cloud API Webhook Payload Types ─────────────────────────────────

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: any[];
}

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type:
    | 'text'
    | 'image'
    | 'document'
    | 'audio'
    | 'video'
    | 'location'
    | 'contacts'
    | 'interactive'
    | 'button'
    | 'reaction';
  text?: { body: string };
  image?: {
    caption?: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
}

// ─── Internal Types ──────────────────────────────────────────────────────────

export interface ParsedProduct {
  title: string;
  price: number;
}

export interface Merchant {
  id: string;
  phone_number?: string;
  instagram_id?: string;
  messenger_id?: string;
  store_name: string;
  store_slug: string;
  is_active: boolean;
  subscription_plan: string;
  subscription_ends_at: string;
  created_at: string;
}

export interface Product {
  id: string;
  merchant_id: string;
  title: string;
  price: number;
  original_image_url: string;
  processed_image_url: string;
  is_available: boolean;
  fulfillment_type?: 'buy' | 'prebook';
  created_at: string;
}
