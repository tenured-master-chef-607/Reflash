'use client';

/**
 * Utility to help create the required tables in Supabase
 * This can be used by users to initialize their database
 */

/**
 * Creates the required tables in Supabase
 */
export async function createRequiredTables(url: string, key: string) {
  try {
    console.log('Creating required tables in Supabase...');
    
    if (!url || !key) {
      return {
        success: false,
        message: 'Missing Supabase URL or API key'
      };
    }
    
    // Make sure URL is formatted correctly
    url = url.replace(/\/$/, '');
    
    const results = [];
    
    // Create accounting_accounts table
    try {
      const createAccountsResult = await createTable(
        url, 
        key, 
        'accounting_accounts',
        `
          id serial primary key,
          name text not null,
          type text not null,
          balance numeric default 0,
          created_at timestamp with time zone default now(),
          updated_at timestamp with time zone default now()
        `
      );
      results.push(createAccountsResult);
      
      // Insert sample data
      if (createAccountsResult.success) {
        await insertSampleData(url, key, 'accounting_accounts', [
          { name: 'Cash', type: 'asset', balance: 50000 },
          { name: 'Accounts Receivable', type: 'asset', balance: 25000 },
          { name: 'Revenue', type: 'income', balance: 100000 },
          { name: 'Expenses', type: 'expense', balance: 45000 }
        ]);
      }
    } catch (error) {
      console.error('Error creating accounts table:', error);
      results.push({
        table: 'accounting_accounts',
        success: false,
        message: String(error)
      });
    }
    
    // Create accounting_balance_sheets table
    try {
      const createBalanceSheetsResult = await createTable(
        url,
        key,
        'accounting_balance_sheets',
        `
          id serial primary key,
          date date not null,
          total_assets numeric not null,
          total_liabilities numeric not null,
          total_equity numeric not null,
          current_ratio numeric,
          created_at timestamp with time zone default now(),
          updated_at timestamp with time zone default now()
        `
      );
      results.push(createBalanceSheetsResult);
      
      // Insert sample data
      if (createBalanceSheetsResult.success) {
        await insertSampleData(url, key, 'accounting_balance_sheets', [
          { 
            date: '2023-04-01', 
            total_assets: 150000, 
            total_liabilities: 50000,
            total_equity: 100000,
            current_ratio: 2.5
          },
          { 
            date: '2023-03-01', 
            total_assets: 145000, 
            total_liabilities: 48000,
            total_equity: 97000,
            current_ratio: 2.4
          }
        ]);
      }
    } catch (error) {
      console.error('Error creating balance sheets table:', error);
      results.push({
        table: 'accounting_balance_sheets',
        success: false,
        message: String(error)
      });
    }
    
    // Create accounting_transactions table
    try {
      const createTransactionsResult = await createTable(
        url,
        key,
        'accounting_transactions',
        `
          id serial primary key,
          date date not null,
          amount numeric not null,
          description text,
          account_id integer references accounting_accounts(id),
          type text not null,
          created_at timestamp with time zone default now(),
          updated_at timestamp with time zone default now()
        `
      );
      results.push(createTransactionsResult);
      
      // Insert sample data
      if (createTransactionsResult.success) {
        // Generate 20 sample transactions
        const sampleTransactions = Array.from({ length: 20 }, (_, i) => ({
          date: new Date(2023, 3, i % 30 + 1).toISOString().split('T')[0],
          amount: Math.floor(Math.random() * 10000) / 100,
          description: `Transaction ${i + 1}`,
          account_id: (i % 4) + 1,
          type: i % 2 === 0 ? 'credit' : 'debit'
        }));
        
        await insertSampleData(url, key, 'accounting_transactions', sampleTransactions);
      }
    } catch (error) {
      console.error('Error creating transactions table:', error);
      results.push({
        table: 'accounting_transactions',
        success: false,
        message: String(error)
      });
    }
    
    // Create accounting_expenses table
    try {
      const createExpensesResult = await createTable(
        url,
        key,
        'accounting_expenses',
        `
          id serial primary key,
          remote_id text,
          transaction_date date,
          created_at timestamp with time zone default now(),
          modified_at timestamp with time zone default now(),
          remote_created_at timestamp with time zone,
          account text,
          contact text,
          total_amount numeric not null,
          sub_total numeric,
          total_tax_amount numeric,
          currency text,
          exchange_rate numeric,
          inclusive_of_tax boolean,
          company text,
          employee text,
          memo text,
          remote_was_deleted boolean default false,
          accounting_period text,
          tracking_category_ids text,
          org_id text,
          source_id text
        `
      );
      results.push(createExpensesResult);
      
      // Insert sample data
      if (createExpensesResult.success) {
        // Generate 15 sample expenses
        const sampleExpenses = Array.from({ length: 15 }, (_, i) => ({
          transaction_date: new Date(2023, 3, i % 30 + 1).toISOString().split('T')[0],
          total_amount: Math.floor(Math.random() * 5000) / 100,
          memo: `Expense ${i + 1}`,
          tracking_category_ids: ['Office', 'Salary', 'Marketing', 'Utilities', 'Other'][i % 5]
        }));
        
        await insertSampleData(url, key, 'accounting_expenses', sampleExpenses);
      }
    } catch (error) {
      console.error('Error creating expenses table:', error);
      results.push({
        table: 'accounting_expenses',
        success: false,
        message: String(error)
      });
    }
    
    const allSuccessful = results.every(r => r.success);
    
    return {
      success: allSuccessful,
      message: allSuccessful 
        ? 'All tables created successfully' 
        : 'Some tables failed to create. Check the detailed results.',
      results
    };
  } catch (error) {
    console.error('Error creating tables:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
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
 * Helper to insert sample data into a table
 */
async function insertSampleData(url: string, key: string, tableName: string, data: any[]) {
  if (!data || data.length === 0) return;
  
  try {
    const response = await fetch(`${url}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to insert sample data into ${tableName}:`, error);
    }
  } catch (error) {
    console.error(`Error inserting sample data into ${tableName}:`, error);
  }
}

/**
 * Create a test table to verify database connectivity
 */
export async function createTestTable(url: string, key: string) {
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