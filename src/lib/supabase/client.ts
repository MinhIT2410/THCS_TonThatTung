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
function createMockSupabaseProxy(): any {
  const dummyPromise = Promise.resolve({ data: [] as any, error: null });

  const proxy: any = new Proxy(() => {}, {
    get(target, prop, receiver) {
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

      if (prop === 'then') {
        return dummyPromise.then.bind(dummyPromise);
      }
      if (prop === 'catch') {
        return dummyPromise.catch.bind(dummyPromise);
      }
      if (prop === 'finally') {
        return dummyPromise.finally.bind(dummyPromise);
      }

      if (prop === 'error') {
        return null;
      }

      if (prop === 'data') {
        return { publicUrl: '' };
      }

      // Return another proxy to allow chaining of properties/methods
      return createMockSupabaseProxy();
    },

    apply(target, thisArg, argumentsList) {
      // Return another proxy to allow chaining of function calls (e.g., .schema('school').from('table'))
      return createMockSupabaseProxy();
    }
  });

  return proxy;
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabaseProxy();
