// This module provides direct fetch functions that don't use the Supabase client
// Useful as a fallback when the Supabase client has issues

// Track verbose logging state
let verboseLogging = false;

/**
 * Directly fetches data from Supabase REST API
 * @param table The table name to query
 * @param apiKey The Supabase API key
 * @param baseUrl The Supabase URL
 * @returns The data from the table or null if credentials are missing
 */
export async function fetchTableData(
  table: string,
  apiKey: string = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY || '',
  baseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
) {
  try {
    if (verboseLogging) {
      console.log(`Attempting direct fetch for table: ${table}`);
      console.log(`API Key available: ${!!apiKey}, Length: ${apiKey?.length || 0}`);
      console.log(`Base URL available: ${!!baseUrl}, Length: ${baseUrl?.length || 0}`);
      if (baseUrl) {
        console.log(`Base URL starts with: ${baseUrl.substring(0, 8)}...`);
      }
    } else {
      // Simpler logging in non-verbose mode
      console.log(`Attempting direct fetch for table: ${table}`);
    }
    
    // Handle missing credentials - return null instead of throwing error
    if (!baseUrl || !apiKey) {
      console.log('Missing Supabase credentials for direct fetch - returning null');
      return null;
    }

    // Format the URL correctly
    const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/${table}`;
    
    if (verboseLogging) {
      console.log(`Direct fetch from: ${url}`);
      
      // Make the request with proper Supabase headers
      const headers = {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };
      
      console.log('Request headers:', JSON.stringify(headers, null, 2).replace(apiKey, '[REDACTED]'));
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
    
    if (verboseLogging) {
      console.log(`Response status: ${response.status}`);
      console.log(`Response OK: ${response.ok}`);
    }
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Error response body: ${responseText}`);
      throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseText}`);
    }
    
    const data = await response.json();
    
    if (verboseLogging) {
      console.log(`Successfully fetched ${data?.length || 0} rows from ${table}`);
      console.log(`Sample data:`, data?.length > 0 ? JSON.stringify(data[0]) : 'No data');
    } else {
      console.log(`Fetched ${data?.length || 0} rows from ${table}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching table ${table}:`, error);
    throw error;
  }
}

/**
 * Gets all available tables from Supabase
 * @returns List of table names
 */
export async function getAvailableTables() {
  // Use a predefined list of financial tables as we can't easily query all tables
  return [
    'accounting_accounts',
    'accounting_balance_sheets',
    'accounting_transactions',
    'accounting_journal_entries',
    'financial_metrics',
    'financial_ratios'
  ];
}

/**
 * Enable or disable verbose logging for direct fetches
 * @param enabled Whether to enable verbose logging
 */
export function setVerboseLogging(enabled: boolean) {
  verboseLogging = enabled;
} 