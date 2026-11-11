import { createClient } from '@supabase/supabase-js';

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://xtskjevtskjjlyusccxy.supabase.co';

export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_w5Oy1eF7_4flHN4a7-8qzA_bQdQeEOY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);