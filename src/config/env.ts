/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',

  enableCmsEditing: import.meta.env.VITE_ENABLE_CMS_EDITING === 'true',
  enableDemoFallback: import.meta.env.VITE_ENABLE_DEMO_FALLBACK === 'true',

  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

export const isSupabaseConfigured = !!(
  env.supabaseUrl &&
  env.supabaseAnonKey &&
  env.supabaseUrl !== 'undefined' &&
  env.supabaseAnonKey !== 'undefined' &&
  env.supabaseUrl !== 'null' &&
  env.supabaseAnonKey !== 'null' &&
  (env.supabaseUrl.startsWith('http://') || env.supabaseUrl.startsWith('https://'))
);

export const canUseDemoFallback =
  env.isDev && env.enableDemoFallback && !isSupabaseConfigured;
