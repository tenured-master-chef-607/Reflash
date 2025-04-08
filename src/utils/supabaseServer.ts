import { createClient } from '@supabase/supabase-js';
import './fetch-polyfill';
import { getEnv } from './environmentOverrides';
import { getServerCredentials } from '@/app/api/env-set/route';
import { headers, cookies } from 'next/headers';

// Track if we've already shown the credentials warning
let hasWarnedCredentials = false;

/**
 * Gets Supabase server settings from environment variables
 */
export function getSupabaseServerSettings() {
  // Get credentials from environment variables
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
  
  return { url, key };
}

/**
 * Creates a Supabase client for server components using available credentials.
 * Returns a dummy client if credentials aren't set.
 */
export function createServerSupabaseClient() {
  const { url, key } = getSupabaseServerSettings();
  
  // Only create a real Supabase client if both URL and key are present
  if (!url || !key) {
    console.log('No Supabase credentials available, returning dummy client');
    return createDummyClient();
  }
  
  console.log('Creating Supabase client with credentials');
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Creates a dummy Supabase client for when credentials aren't available
 */
function createDummyClient() {
  // Return a dummy client that doesn't make actual network requests
  return {
    from: () => ({
      select: () => Promise.resolve({ 
        data: null, 
        error: new Error('No Supabase credentials available. Please configure them in Settings.') 
      }),
      insert: () => Promise.resolve({
        data: null,
        error: new Error('No Supabase credentials available. Please configure them in Settings.')
      }),
      update: () => Promise.resolve({
        data: null,
        error: new Error('No Supabase credentials available. Please configure them in Settings.')
      }),
      delete: () => Promise.resolve({
        data: null,
        error: new Error('No Supabase credentials available. Please configure them in Settings.')
      }),
    }),
    rpc: () => Promise.resolve({ 
      data: null, 
      error: new Error('No Supabase credentials available. Please configure them in Settings.') 
    }),
  } as any;
} 