'use client';

import { createClient } from '@supabase/supabase-js';
import './fetch-polyfill';
import { getEnv } from './environmentOverrides';

/**
 * Gets Supabase settings from localStorage
 * @returns Supabase settings object with url and key
 */
export function getSupabaseSettings() {
  if (typeof window === 'undefined') {
    return {
      url: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      key: getEnv('NEXT_PUBLIC_SUPABASE_KEY'),
    };
  }

  // Get settings from localStorage
  const savedSettings = localStorage.getItem('reflashSettings');
  if (!savedSettings) {
    return {
      url: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      key: getEnv('NEXT_PUBLIC_SUPABASE_KEY'),
    };
  }

  try {
    const settings = JSON.parse(savedSettings);
    return {
      url: settings.supabaseUrl || getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      key: settings.supabaseKey || getEnv('NEXT_PUBLIC_SUPABASE_KEY'),
    };
  } catch (error) {
    console.error('Error parsing Supabase settings from localStorage:', error);
    return {
      url: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      key: getEnv('NEXT_PUBLIC_SUPABASE_KEY'),
    };
  }
}

/**
 * Creates a Supabase client using settings from localStorage
 * @returns Supabase client instance
 */
export function createSupabaseClient() {
  const { url, key } = getSupabaseSettings();
  
  if (!url || !key) {
    console.warn('Missing Supabase credentials in settings');
    // Return a dummy client that will trigger fallback data
    return createDummyClient();
  }
  
  // console.log('Creating Supabase client with settings from localStorage');
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
      select: () => Promise.resolve({ data: null, error: new Error('No Supabase credentials available') }),
    }),
    rpc: () => Promise.resolve({ data: null, error: new Error('No Supabase credentials available') }),
  } as any;
} 