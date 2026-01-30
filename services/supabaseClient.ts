import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create client with empty strings if env vars are missing (will fail gracefully at runtime)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Database Types
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          description: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          color: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          color?: string;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string;
          deadline: string;
          is_completed: boolean;
          completed_at: string | null;
          priority: 'Low' | 'Medium' | 'High';
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description: string;
          deadline: string;
          is_completed?: boolean;
          completed_at?: string | null;
          priority: 'Low' | 'Medium' | 'High';
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string;
          deadline?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          priority?: 'Low' | 'Medium' | 'High';
          created_at?: string;
        };
      };
    };
  };
};
