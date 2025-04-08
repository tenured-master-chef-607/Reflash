/**
 * Utility for managing environment variable overrides
 * This allows us to override environment variables at runtime
 * which is useful for settings that are changed through the UI
 */

// Store overrides in memory
let environmentOverrides: Record<string, string> = {};

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
  
  // Add debugging for missing critical variables
  if (!envValue && (
    key === 'SUPABASE_URL' || 
    key === 'SUPABASE_KEY' || 
    key === 'NEXT_PUBLIC_SUPABASE_URL' || 
    key === 'NEXT_PUBLIC_SUPABASE_KEY'
  )) {
    console.warn(`Missing critical environment variable: ${key}`);
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
 * Update environment variable overrides from settings
 * @param settings The settings object from localStorage
 */
export function updateEnvFromSettings(settings: any): void {
  if (!settings) return;
  
  // Update Supabase settings
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
  
  // Log the update (for debugging)
  console.log('Updated environment overrides from settings');
}

/**
 * Custom event to notify the application that environment variables have changed
 */
export function notifyEnvironmentChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('environment-changed'));
  }
}

/**
 * Reset all environment variable overrides
 */
export function resetEnvOverrides(): void {
  environmentOverrides = {};
}

// Export the overrides object for debugging
export const getOverrides = () => ({ ...environmentOverrides }); 