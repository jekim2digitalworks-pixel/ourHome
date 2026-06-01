/**
 * Hand-maintained DB types. After applying supabase/schema.sql you can
 * regenerate this file with:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
 *
 * Each table carries `Relationships: []` and the schema carries the
 * Views/Functions/Enums/CompositeTypes keys that supabase-js requires —
 * without them the query helpers resolve column types to `never`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TxType = "income" | "expense";
export type BabyCategory = "feeding" | "food" | "pee" | "poop" | "sleep" | "bath" | "memo";

export interface Database {
  public: {
    Tables: {
      families: {
        Row: { id: string; name: string; created_at: string; created_by: string };
        Insert: { id?: string; name: string; created_by: string };
        Update: { name?: string };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          family_id: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: { id: string; family_id?: string | null; display_name?: string | null };
        Update: { family_id?: string | null; display_name?: string | null; avatar_url?: string | null };
        Relationships: [];
      };
      settings: {
        Row: {
          user_id: string;
          enabled_tabs: string[];
          primary_tab: string;
          tab_order: string[];
          theme: string;
          updated_at: string;
        };
        Insert: { user_id: string; enabled_tabs?: string[]; primary_tab?: string; tab_order?: string[]; theme?: string };
        Update: { enabled_tabs?: string[]; primary_tab?: string; tab_order?: string[]; theme?: string };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          family_id: string;
          author_id: string;
          type: TxType;
          // Stored in minor units (₩ has none, but kept integer-safe for cents-style currencies).
          amount_minor: number;
          category: string;
          memo: string | null;
          is_fixed: boolean;
          occurred_on: string;
          created_at: string;
        };
        Insert: {
          family_id: string;
          author_id: string;
          type: TxType;
          amount_minor: number;
          category: string;
          memo?: string | null;
          is_fixed?: boolean;
          occurred_on: string;
        };
        Update: Partial<{
          type: TxType;
          amount_minor: number;
          category: string;
          memo: string | null;
          is_fixed: boolean;
          occurred_on: string;
        }>;
        Relationships: [];
      };
      baby_records: {
        Row: {
          id: string;
          family_id: string;
          author_id: string;
          category: BabyCategory;
          detail: Json;
          note: string | null;
          recorded_at: string;
          created_at: string;
        };
        Insert: {
          family_id: string;
          author_id: string;
          category: BabyCategory;
          detail?: Json;
          note?: string | null;
          recorded_at?: string;
        };
        Update: Partial<{ category: BabyCategory; detail: Json; note: string | null; recorded_at: string }>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          family_id: string;
          author_id: string;
          title: string;
          description: string | null;
          starts_at: string;
          ends_at: string | null;
          google_event_id: string | null;
          created_at: string;
        };
        Insert: {
          family_id: string;
          author_id: string;
          title: string;
          description?: string | null;
          starts_at: string;
          ends_at?: string | null;
          google_event_id?: string | null;
        };
        Update: Partial<{ title: string; description: string | null; starts_at: string; ends_at: string | null }>;
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          family_id: string;
          author_id: string;
          drive_file_id: string;
          web_view_link: string;
          thumbnail_link: string | null;
          taken_on: string;
          caption: string | null;
          category_id: string | null;
          created_at: string;
        };
        Insert: {
          family_id: string;
          author_id: string;
          drive_file_id: string;
          web_view_link: string;
          thumbnail_link?: string | null;
          taken_on: string;
          caption?: string | null;
          category_id?: string | null;
        };
        Update: Partial<{ caption: string | null; taken_on: string; category_id: string | null }>;
        Relationships: [];
      };
      photo_categories: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: { family_id: string; name: string; sort_order?: number };
        Update: Partial<{ name: string; sort_order: number }>;
        Relationships: [];
      };
      google_tokens: {
        Row: {
          user_id: string;
          refresh_token: string;
          access_token: string | null;
          scope: string | null;
          expiry_date: number | null;
          drive_root_folder_id: string | null;
          updated_at: string;
        };
        Insert: { user_id: string; refresh_token: string; access_token?: string | null; scope?: string | null; expiry_date?: number | null };
        Update: Partial<{ refresh_token: string; access_token: string | null; scope: string | null; expiry_date: number | null; drive_root_folder_id: string | null }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_family_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
