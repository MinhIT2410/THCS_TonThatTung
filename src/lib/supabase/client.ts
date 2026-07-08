/// <reference types="vite/client" />

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://localhost';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'none';
export const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  if (import.meta.env.DEV) {
    console.warn('Missing Supabase environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
