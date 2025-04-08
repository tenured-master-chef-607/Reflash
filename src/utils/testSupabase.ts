/**
 * Utility to test Supabase connectivity
 * Can be run directly in the browser console
 */

/**
 * Tests a Supabase connection with provided credentials
 */
export async function testSupabaseConnection(url: string, key: string) {
  try {
    console.log('Testing Supabase connection...');
    
    // Validate credentials
    if (!url || !key) {
      return {
        success: false,
        message: 'Missing Supabase URL or API key'
      };
    }

    // Format the URL correctly
    url = url.replace(/\/$/, '');
    
    // First, let's just check general API access
    const baseTestUrl = `${url}/rest/v1/`;
    
    console.log(`Testing base API access: ${baseTestUrl}`);
    
    const baseResponse = await fetch(baseTestUrl, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!baseResponse.ok) {
      const baseErrorText = await baseResponse.text();
      
      if (baseResponse.status === 401 || baseResponse.status === 403) {
        return {
          success: false,
          message: `Authentication failed. Make sure you're using the correct API key (anon key from Supabase).`,
          status: baseResponse.status,
          error: baseErrorText
        };
      } else {
        return {
          success: false,
          message: `API connection failed with status ${baseResponse.status}. Check your Supabase URL and API key.`,
          status: baseResponse.status,
          error: baseErrorText
        };
      }
    }
    
    // We'll check for tables in a separate API call since this is just to verify connection
    return {
      success: true,
      message: 'Connection to Supabase successful',
      status: baseResponse.status
    };
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return {
      success: false,
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Notifies the app that Supabase connection was tested successfully
 */
export function notifyConnectionTested(url: string, key: string, success: boolean) {
  if (typeof window !== 'undefined') {
    // Dispatch event to notify other components about the connection test
    window.dispatchEvent(new CustomEvent('supabase-connection-tested', {
      detail: {
        url,
        key,
        success
      }
    }));
  }
}
 