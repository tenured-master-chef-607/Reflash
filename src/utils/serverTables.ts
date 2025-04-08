/**
 * Server-side utility for table operations in Supabase
 * This file contains functions that can be used in server components and API routes
 */

/**
 * Tests a Supabase connection with provided credentials (server-side version)
 * Requires explicit credentials - does not use environment variables
 */
export function testSupabaseConnectionServer(url: string, key: string) {
  if (!url || !key) {
    return {
      success: false,
      message: 'Missing Supabase URL or API key'
    };
  }

  try {
    console.log('Testing Supabase connection...');
    
    // Format the URL correctly
    url = url.replace(/\/$/, '');
    
    // First, let's just check general API access
    const baseTestUrl = `${url}/rest/v1/`;
    
    console.log(`Testing base API access: ${baseTestUrl}`);
    
    return fetch(baseTestUrl, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    }).then(async baseResponse => {
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
    });
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return {
      success: false,
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Helper to create a single table in Supabase
 */
async function createTable(url: string, key: string, tableName: string, schema: string) {
  try {
    // Check if table exists first
    const checkResponse = await fetch(`${url}/rest/v1/${tableName}?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (checkResponse.ok) {
      return {
        table: tableName,
        success: true,
        message: `Table ${tableName} already exists`
      };
    }
    
    // Table doesn't exist, create it
    const createSql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${schema}
      );
    `;
    
    // Try to use the SQL execute function
    try {
      const response = await fetch(`${url}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          sql: createSql
        })
      });
      
      if (response.ok) {
        return {
          table: tableName,
          success: true,
          message: `Table ${tableName} created successfully using RPC`
        };
      } 
      
      // If RPC fails, check the error
      const responseText = await response.text();
      console.error(`Failed to create table using RPC: ${responseText}`);
      
      if (response.status === 404) {
        // RPC function not found, guide user to create tables manually
        return {
          table: tableName,
          success: false,
          message: `The 'execute_sql' RPC function is not available in your Supabase project. Please create tables manually in the Supabase dashboard.`
        };
      } else {
        return {
          table: tableName,
          success: false,
          message: `Failed to create table with error: ${responseText}`
        };
      }
    } catch (rpcError) {
      console.error('RPC error:', rpcError);
      return {
        table: tableName,
        success: false,
        message: `RPC error: Your Supabase project may not have the required SQL execute function available. Please create tables manually in the Supabase dashboard.`
      };
    }
  } catch (error) {
    return {
      table: tableName,
      success: false,
      message: `Error creating table: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Create a test table to verify database connectivity (server-side version)
 */
export async function createTestTableServer(url: string, key: string) {
  try {
    console.log('Creating test table to verify database connectivity...');
    
    if (!url || !key) {
      return {
        success: false,
        message: 'Missing Supabase URL or API key'
      };
    }
    
    // Make sure URL is formatted correctly
    url = url.replace(/\/$/, '');
    
    // Create a simple test table
    const result = await createTable(
      url, 
      key, 
      'test_connectivity',
      `
        id serial primary key,
        test_value text not null,
        created_at timestamp with time zone default now()
      `
    );
    
    if (result.success) {
      // Insert a test row to verify write permissions
      try {
        const insertResponse = await fetch(`${url}/rest/v1/test_connectivity`, {
          method: 'POST',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            test_value: 'Connection test at ' + new Date().toISOString()
          })
        });
        
        if (insertResponse.ok) {
          return {
            success: true,
            message: 'Successfully created test table and inserted data. Database connection is working properly.',
            details: {
              table: 'test_connectivity',
              canCreate: true,
              canInsert: true
            }
          };
        } else {
          return {
            success: true,
            message: 'Created test table but could not insert data. Check table permissions.',
            details: {
              table: 'test_connectivity',
              canCreate: true,
              canInsert: false,
              insertError: await insertResponse.text()
            }
          };
        }
      } catch (insertError) {
        return {
          success: true,
          message: 'Created test table but error when inserting: ' + String(insertError),
          details: {
            table: 'test_connectivity',
            canCreate: true,
            canInsert: false,
            error: String(insertError)
          }
        };
      }
    } else {
      return result;
    }
  } catch (error) {
    console.error('Error creating test table:', error);
    return {
      success: false,
      message: 'Error creating test table: ' + String(error)
    };
  }
} 