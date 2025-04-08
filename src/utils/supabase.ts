import { createClient } from '@supabase/supabase-js';
import './fetch-polyfill'; // Import the fetch polyfill
import { getEnv } from './environmentOverrides';

// Get Supabase credentials from environment variables or overrides
const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_KEY');

// Enhanced debug logs to help troubleshoot
// console.log('Environment variables check:');
// console.log('SUPABASE_URL available:', !!getEnv('SUPABASE_URL'));
// console.log('SUPABASE_KEY available:', !!getEnv('SUPABASE_KEY'));
// console.log('NEXT_PUBLIC_SUPABASE_URL available:', !!supabaseUrl);
// console.log('NEXT_PUBLIC_SUPABASE_KEY available:', !!supabaseKey);

// Create Supabase client with fetch configuration for both browser and Node.js
// Handle missing environment variables gracefully
export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    persistSession: false, // Disable session persistence
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
}); 