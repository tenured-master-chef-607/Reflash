'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseSettings } from '@/utils/supabaseSettings';
import { testSupabaseConnection } from '@/utils/testSupabase';
import { updateEnvFromSettings, notifyEnvironmentChanged, hasSupabaseCredentials } from '@/utils/environmentOverrides';

// Function to securely set cookies for Supabase credentials
function setCookiesForSupabase(url: string, key: string) {
  // Set cookies with secure flag if in production
  // These will be read by middleware and forwarded to server components via headers
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = '; SameSite=Lax'; // Use Lax to allow page redirections to include cookie
  
  // Set cookies with 7-day expiration (or adjust as needed)
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  
  // Set cookies for both the URL and key
  // Make sure URL is properly encoded - Supabase URLs contain : and // which need encoding
  const encodedUrl = encodeURIComponent(url);
  const encodedKey = encodeURIComponent(key);
  
  document.cookie = `supabase-url=${encodedUrl}; path=/; expires=${expires.toUTCString()}${secure}${sameSite}`;
  document.cookie = `supabase-key=${encodedKey}; path=/; expires=${expires.toUTCString()}${secure}${sameSite}`;
}

// Clear Supabase cookies
function clearSupabaseCookies() {
  document.cookie = 'supabase-url=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'supabase-key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export default function LanderPage() {
  const router = useRouter();
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);

  useEffect(() => {
    // Check for existing credentials to pre-fill the form
    const settings = localStorage.getItem('reflashSettings');
    if (settings) {
      const parsedSettings = JSON.parse(settings);
      if (parsedSettings.supabaseUrl) setSupabaseUrl(parsedSettings.supabaseUrl);
      if (parsedSettings.supabaseKey) setSupabaseKey(parsedSettings.supabaseKey);
    }
    
    // IMPORTANT: Mark that the user has visited the lander page
    // This will prevent the credentials form from showing on the dashboard
    localStorage.setItem('hasVisitedBefore', 'true');
    
    // If there are no previous settings, initialize an empty object
    if (!localStorage.getItem('reflashSettings')) {
      localStorage.setItem('reflashSettings', JSON.stringify({}));
    }
  }, []);

  const handleSave = async () => {
    if (!supabaseUrl && !supabaseKey) {
      setTestResult({
        success: false,
        message: 'Please enter both Supabase URL and API Key'
      });
      return;
    }

    // Validate URL format
    if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
      setTestResult({
        success: false,
        message: 'Supabase URL must start with https://'
      });
      return;
    }
    
    // Sanitize URL - remove trailing slashes, decode if already encoded
    let sanitizedUrl = supabaseUrl?.trim() || '';
    
    // Remove trailing slash if present
    sanitizedUrl = sanitizedUrl.replace(/\/$/, '');
    
    // Decode URL if it's already encoded (contains %)
    if (sanitizedUrl.includes('%')) {
      try {
        sanitizedUrl = decodeURIComponent(sanitizedUrl);
      } catch (e) {
        console.warn('Failed to decode URL, using as-is:', e);
      }
    }
    
    // Trim the key
    const sanitizedKey = supabaseKey?.trim() || '';

    setTesting(true);
    setTestResult(null);

    try {
      // Test connection first
      const result = await testSupabaseConnection(sanitizedUrl, sanitizedKey);
      
      setTestResult(result);
      
      // Save settings regardless of the test result
      // 1. Save to localStorage
      const settings = localStorage.getItem('reflashSettings') 
        ? JSON.parse(localStorage.getItem('reflashSettings') || '{}') 
        : {};
      
      if (sanitizedUrl) settings.supabaseUrl = sanitizedUrl;
      if (sanitizedKey) settings.supabaseKey = sanitizedKey;
      
      localStorage.setItem('reflashSettings', JSON.stringify(settings));
      
      // 2. Set cookies for server-side access if both values are provided
      if (sanitizedUrl && sanitizedKey) {
        setCookiesForSupabase(sanitizedUrl, sanitizedKey);
      }
      
      // 3. Update environment overrides
      updateEnvFromSettings(settings);
      notifyEnvironmentChanged({ skipReload: true });
      
      // Set flag based on connection result
      if (!result.success) {
        localStorage.setItem('userSkippedCredentials', 'true');
      } else {
        localStorage.removeItem('userSkippedCredentials');
      }
      
      // Redirect to dashboard after short delay regardless of connection result
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error) {
      // If error occurred during test, treat as skipped but still save partial credentials
      localStorage.setItem('userSkippedCredentials', 'true');
      
      setTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } finally {
      setTesting(false);
    }
  };
  
  const skipForNow = () => {
    // Set a flag indicating they chose to skip
    localStorage.setItem('userSkippedCredentials', 'true');
    
    // Clear any previously entered credentials
    const settings = localStorage.getItem('reflashSettings') 
      ? JSON.parse(localStorage.getItem('reflashSettings') || '{}') 
      : {};
    
    // Remove Supabase credentials if they exist
    if (settings.supabaseUrl) delete settings.supabaseUrl;
    if (settings.supabaseKey) delete settings.supabaseKey;
    
    // Save updated settings
    localStorage.setItem('reflashSettings', JSON.stringify(settings));
    
    // Clear any cookies
    clearSupabaseCookies();
    
    // Redirect to dashboard
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">
          Welcome to Reflash Financial Analytics
        </h2>
        
        <p className="mb-4 text-slate-700 dark:text-slate-300">
          To use your own Supabase database, please enter your credentials below.
          You can also skip this step and use demo data instead.
        </p>
        
        <div className="mb-4">
          <label htmlFor="supabaseUrl" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
            Supabase URL
          </label>
          <input
            type="text"
            id="supabaseUrl"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                      bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white"
            placeholder="https://your-project.supabase.co"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Example: https://abcdefg.supabase.co
          </p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="supabaseKey" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
            Supabase API Key
          </label>
          <input
            type="password"
            id="supabaseKey"
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                      bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white"
            placeholder="your-supabase-api-key"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Use the <code>anon</code> public key from your Supabase project settings.
          </p>
        </div>
        
        <div className="mb-4 text-xs italic text-slate-500 dark:text-slate-400">
          Your credentials will be stored securely in your browser and will not be shared.
        </div>
        
        {testResult && (
          <div className={`mb-4 p-3 rounded-md ${
            testResult.success
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            {testResult.message}
          </div>
        )}
        
        <div className="flex flex-col md:flex-row justify-between gap-3">
          <button
            type="button"
            onClick={skipForNow}
            className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 transition-colors order-2 md:order-1"
          >
            Skip & Use Demo Data
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={testing || (!supabaseUrl && !supabaseKey)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
                     disabled:bg-indigo-300 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors order-1 md:order-2"
          >
            {testing ? 'Testing Connection...' : 'Save & Connect'}
          </button>
        </div>
      </div>
    </div>
  );
} 