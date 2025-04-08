/**
 * Utility for managing environment variable overrides
 * This allows us to override environment variables at runtime
 * which is useful for settings that are changed through the UI
 */

// Store overrides in memory
let environmentOverrides: Record<string, string> = {};

// Keep track of which environment variable warnings we've already shown
const warnedEnvVariables = new Set<string>();

// Initialize from localStorage if available
if (typeof window !== 'undefined') {
  try {
    const savedSettings = localStorage.getItem('reflashSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.supabaseUrl) {
        environmentOverrides['NEXT_PUBLIC_SUPABASE_URL'] = settings.supabaseUrl;
        environmentOverrides['SUPABASE_URL'] = settings.supabaseUrl;
      }
      if (settings.supabaseKey) {
        environmentOverrides['NEXT_PUBLIC_SUPABASE_KEY'] = settings.supabaseKey;
        environmentOverrides['SUPABASE_KEY'] = settings.supabaseKey;
      }
      // Add other environment variables as needed
      if (settings.openaiKey) {
        environmentOverrides['OPENAI_API_KEY'] = settings.openaiKey;
      }
    }
  } catch (error) {
    console.error('Error loading environment overrides from localStorage:', error);
  }
}

/**
 * Get an environment variable, checking for runtime overrides first
 * @param key The environment variable name
 * @returns The value of the environment variable
 */
export function getEnv(key: string): string {
  // Check for runtime override first
  if (environmentOverrides[key] !== undefined) {
    return environmentOverrides[key];
  }
  
  // Then fall back to Next.js environment variables
  const envValue = process.env[key] || '';
  
  // Add debugging for missing critical variables (but only once per variable)
  if (!envValue && (
    key === 'SUPABASE_URL' || 
    key === 'SUPABASE_KEY' || 
    key === 'NEXT_PUBLIC_SUPABASE_URL' || 
    key === 'NEXT_PUBLIC_SUPABASE_KEY'
  )) {
    if (!warnedEnvVariables.has(key)) {
      console.warn(`Missing critical environment variable: ${key}`);
      warnedEnvVariables.add(key);
    }
  }
  
  return envValue;
}

/**
 * Set an environment variable override at runtime
 * @param key The environment variable name
 * @param value The value to set
 */
export function setEnv(key: string, value: string): void {
  environmentOverrides[key] = value;
}

/**
 * Check if essential Supabase credentials exist
 * @returns Boolean indicating if Supabase credentials are available
 */
export function hasSupabaseCredentials(): boolean {
  // Check if we have Supabase URL and key in either environment or overrides
  const hasUrl = !!(getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL'));
  const hasKey = !!(getEnv('SUPABASE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_KEY'));
  
  return hasUrl && hasKey;
}

// Set a cookie for server-side access to environment variables
function setCookie(name: string, value: string, days: number = 7) {
  if (typeof window === 'undefined') return;
  
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = '; SameSite=Lax'; // Use Lax to allow page redirections to include cookie
  
  // Set cookies with specified expiration
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires.toUTCString()}${secure}${sameSite}`;
}

/**
 * Update environment variable overrides from settings
 * @param settings The settings object from localStorage
 */
export function updateEnvFromSettings(settings: any): void {
  if (!settings) return;
  
  // Update Supabase settings
  if (settings.supabaseUrl) {
    environmentOverrides['NEXT_PUBLIC_SUPABASE_URL'] = settings.supabaseUrl;
    environmentOverrides['SUPABASE_URL'] = settings.supabaseUrl;
    setCookie('supabase-url', settings.supabaseUrl);
  }
  
  if (settings.supabaseKey) {
    environmentOverrides['NEXT_PUBLIC_SUPABASE_KEY'] = settings.supabaseKey;
    environmentOverrides['SUPABASE_KEY'] = settings.supabaseKey;
    setCookie('supabase-key', settings.supabaseKey);
  }
  
  // Add OpenAI API key with the same pattern as Supabase
  if (settings.openaiKey) {
    environmentOverrides['OPENAI_API_KEY'] = settings.openaiKey;
    setCookie('openai-api-key', settings.openaiKey);
  }
  
  // Add other environment variables as needed for other data sources
  if (settings.quickbooksKey) {
    environmentOverrides['QUICKBOOKS_API_KEY'] = settings.quickbooksKey;
  }
  
  if (settings.xeroKey) {
    environmentOverrides['XERO_API_KEY'] = settings.xeroKey;
  }
  
  if (settings.sageKey) {
    environmentOverrides['SAGE_API_KEY'] = settings.sageKey;
  }
  
  if (settings.freshbooksKey) {
    environmentOverrides['FRESHBOOKS_API_KEY'] = settings.freshbooksKey;
  }
  
  // Log the update (for debugging)
  console.log('Updated environment overrides from settings');
}

/**
 * Notify the application that environment variables have changed
 * This will trigger a refresh of data that depends on environment variables
 * @param options Optional settings for notification behavior
 */
export function notifyEnvironmentChanged(options?: { quiet?: boolean, skipReload?: boolean }) {
  if (typeof window === 'undefined') return;
  
  if (!options?.quiet) {
    console.log('Environment variables changed');
  }
  
  // Create a custom event to notify listeners of environment change
  const event = new CustomEvent('environment-changed', { 
    detail: { 
      timestamp: Date.now(),
      skipReload: options?.skipReload
    }
  });
  window.dispatchEvent(event);
}

/**
 * Reset all environment variable overrides
 */
export function resetEnvOverrides(): void {
  environmentOverrides = {};
}

// Export the overrides object for debugging
export const getOverrides = () => ({ ...environmentOverrides }); 