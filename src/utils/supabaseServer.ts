import { createClient } from '@supabase/supabase-js';
import './fetch-polyfill';
import { getEnv } from './environmentOverrides';

/**
 * Gets Supabase settings from environment variables (server-side only)
 */
export function getSupabaseServerSettings() {
  return {
    url: getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    key: getEnv('SUPABASE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_KEY'),
  };
}

/**
 * Creates a Supabase client using environment variables (server-side only)
 */
export function createSupabaseServerClient() {
  const { url, key } = getSupabaseServerSettings();
  
  if (!url || !key) {
    console.warn('Missing Supabase credentials in server environment');
    return createDummyClient();
  }
  
  // console.log('Creating Supabase server client with env variables');
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Creates a dummy Supabase client that throws errors for testing fallback
 */
function createDummyClient() {
  return {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: new Error('No Supabase credentials available on server') }),
    }),
    rpc: () => Promise.resolve({ data: null, error: new Error('No Supabase credentials available on server') }),
  } as any;
} 