import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Types for our database tables
export interface Website {
  id: string;
  title: string;
  description: string;
  url: string;
  user_id: string;
  created_at: string;
}

export interface Guide {
  id: string;
  title: string;
  slug: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CourseNote {
  id: string;
  course_code: string;
  notes: string;
  description: string;
  file_url: string | null;
  file_name: string | null;
  user_id: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  link: string;
  user_id: string;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  sort_mode: "date" | "custom";
}

export interface NoteEntry {
  id: string;
  note_id: string;
  user_id: string;
  kind: "text" | "image";
  content: string | null;
  image_path: string | null;
  position: number | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}
