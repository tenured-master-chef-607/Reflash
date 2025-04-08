'use client';

import { useEffect, useState } from 'react';
import { updateEnvFromSettings, notifyEnvironmentChanged } from '@/utils/environmentOverrides';

/**
 * This component synchronizes cookies with environment variables on page load.
 * It should be included in the layout or main component to ensure credentials are synced.
 */
export default function SupabaseEnvironmentSync() {
  const [synced, setSynced] = useState(false);
  
  useEffect(() => {
    async function syncEnvironment() {
      // Function to get cookies by name
      function getCookie(name: string): string {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          const cookieValue = parts.pop()?.split(';').shift();
          return cookieValue || '';
        }
        return '';
      }
  
      // Get credentials from cookies
      const supabaseUrl = getCookie('supabase-url');
      const supabaseKey = getCookie('supabase-key');
      
      // Also try to get from localStorage as a backup
      let localStorageUrl = '';
      let localStorageKey = '';
      
      try {
        const savedSettings = localStorage.getItem('reflashSettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          localStorageUrl = settings.supabaseUrl || '';
          localStorageKey = settings.supabaseKey || '';
        }
      } catch (e) {
        console.error('Error reading from localStorage:', e);
      }
      
      // Use either cookie or localStorage values, preferring cookies
      // Ensure we decode the URL that was encoded when setting the cookie
      const finalUrl = supabaseUrl ? decodeURIComponent(supabaseUrl) : localStorageUrl;
      const finalKey = supabaseKey ? decodeURIComponent(supabaseKey) : localStorageKey;
  
      if (finalUrl && finalKey) {
        console.log('Found Supabase credentials, syncing to environment...', finalUrl.substring(0, 10) + '...');
        
        // Create settings object for environment update
        const settings = {
          supabaseUrl: finalUrl,
          supabaseKey: finalKey
        };
        
        // Update local environment variables
        updateEnvFromSettings(settings);
        notifyEnvironmentChanged({ skipReload: true });
        
        // Make a direct API call to set the server-side credentials
        try {
          // Make sure we're sending the raw, unencoded values directly
          const response = await fetch('/api/env-set', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              supabaseUrl: finalUrl,
              supabaseKey: finalKey
            })
          });
          
          const result = await response.json();
          
          if (result.success) {
            console.log('Server-side environment variables set successfully');
            setSynced(true);
            
            // Check our debug endpoint to verify credentials format
            try {
              const debugResponse = await fetch('/api/debug-credentials');
              const debugResult = await debugResponse.json();
              console.log('Credential debug info:', debugResult);
            } catch (debugError) {
              console.error('Error checking debug credentials:', debugError);
            }
            
            // Don't refresh automatically - let user refresh manually
            /* Removing automatic refresh that was causing infinite loop
            if (!synced) {
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }
            */
          } else {
            console.error('Failed to set server-side environment variables:', result.error);
          }
        } catch (error) {
          console.error('Error setting server-side environment variables:', error);
        }
      }
    }
    
    // Run once on mount
    if (!synced) {
      syncEnvironment();
    }
  }, [synced]);

  // This component doesn't render anything
  return null;
} 