/// <reference types="vite/client" />

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(
  rawUrl &&
  rawKey &&
  rawUrl !== 'undefined' &&
  rawKey !== 'undefined' &&
  rawUrl !== 'null' &&
  rawKey !== 'null' &&
  (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
);

export const supabaseUrl = isSupabaseConfigured ? rawUrl : '';
export const supabaseAnonKey = isSupabaseConfigured ? rawKey : '';

if (!isSupabaseConfigured) {
  if (import.meta.env.DEV) {
    console.warn('Missing Supabase environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
}

// Create a safe, non-crashing proxy client if Supabase is not configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get(target, prop) {
        if (prop === 'auth') {
          return {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({
              data: { subscription: { unsubscribe: () => {} } },
            }),
            signInWithPassword: () => Promise.resolve({ data: { session: null, user: null }, error: null }),
            signOut: () => Promise.resolve({ error: null }),
          };
        }
        return () => Promise.resolve({ data: null, error: null });
      },
    });
