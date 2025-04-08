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
    
    // Now try to access the accounts table to see if it exists
    const testUrl = `${url}/rest/v1/accounting_accounts?limit=1`;
    
    console.log(`Making test request to accounts table: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
      
      return {
        success: true,
        message: `Connection successful (status ${response.status})`,
        tables: ['accounting_accounts'],
        sample: data
      };
    } else {
      const errorText = await response.text();
      
      if (response.status === 404) {
        return {
          success: true, // Still consider this a success for the connection itself
          message: `Connection to Supabase successful, but the 'accounting_accounts' table doesn't exist yet. Use the 'Create Required Tables' button to set up your database.`,
          status: response.status,
          error: errorText,
          needsSetup: true
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: `Authentication failed. Check your API key (anon key).`,
          status: response.status,
          error: errorText
        };
      } else {
        return {
          success: false,
          message: `Connection failed with status ${response.status}`,
          status: response.status,
          error: errorText
        };
      }
    }
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return {
      success: false,
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
 