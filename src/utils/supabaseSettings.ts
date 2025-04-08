'use client';

import { createClient } from '@supabase/supabase-js';
import './fetch-polyfill';
import { getEnv } from './environmentOverrides';

// Track if we've already shown the credentials warning
let hasWarnedCredentials = false;

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
    // Log warning only once to reduce console noise
    if (!hasWarnedCredentials) {
      console.warn('Missing Supabase credentials in settings');
      hasWarnedCredentials = true;
    }
    
    // If we're in the browser and not already on the settings page, suggest navigating there
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/settings')) {
      // Show a console message to guide developers
      if (!hasWarnedCredentials) {
        console.info('You can configure Supabase credentials in the Settings page');
      }
      
      // Return a dummy client that will trigger fallback data but with enhanced error messages
      return createDummyClient();
    }
    
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
      select: () => Promise.resolve({ 
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