import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase URL and Anon Key
// In a real project, use import.meta.env.VITE_SUPABASE_URL
// Check if env vars are loaded
console.log("DEBUG: Supabase URL:", import.meta.env.VITE_SUPABASE_URL ? "Defined" : "UNDEFINED");
console.log("DEBUG: Supabase Key:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "Defined" : "UNDEFINED");

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
