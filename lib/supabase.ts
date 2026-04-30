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
  icon: string;
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
