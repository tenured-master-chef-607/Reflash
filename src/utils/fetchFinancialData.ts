import { supabase } from '@/utils/supabase';
import { fetchTableData, getAvailableTables } from '@/utils/directFetch';
import { createSupabaseClient, getSupabaseSettings } from '@/utils/supabaseSettings';

// Fallback data for when tables don't exist
const fallbackData = {
  accounts: [
    { id: 1, name: 'Cash', type: 'asset', balance: 50000 },
    { id: 2, name: 'Accounts Receivable', type: 'asset', balance: 25000 },
    { id: 3, name: 'Revenue', type: 'income', balance: 100000 },
    { id: 4, name: 'Expenses', type: 'expense', balance: 45000 }
  ],
  balanceSheets: [
    { 
      id: 1, 
      date: '2023-04-01', 
      total_assets: 150000, 
      total_liabilities: 50000,
      total_equity: 100000,
      current_ratio: 2.5
    },
    { 
      id: 2, 
      date: '2023-03-01', 
      total_assets: 145000, 
      total_liabilities: 48000,
      total_equity: 97000,
      current_ratio: 2.4
    }
  ],
  transactions: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    date: new Date(2023, 3, i % 30 + 1).toISOString().split('T')[0],
    amount: Math.floor(Math.random() * 10000) / 100,
    description: `Transaction ${i + 1}`,
    account_id: (i % 4) + 1,
    type: i % 2 === 0 ? 'credit' : 'debit'
  }))
};

/**
 * Fetches financial data from multiple tables to generate stats and charts
 * @returns Object containing data from various financial tables
 */
export async function fetchFinancialData() {
  try {
    console.log('Fetching financial data from Supabase...');
    
    // Get Supabase client with settings from localStorage
    const supabaseClient = createSupabaseClient();
    
    // Get settings for direct fetch fallback
    const settings = getSupabaseSettings();
    
    // Store all our data here
    let accountsData;
    let balanceSheetsData;
    let transactionsData;
    let usedFallback = false;
    
    // Fetch accounts data
    try {
      try {
        // First try using the Supabase client with settings from localStorage
        const { data, error } = await supabaseClient
          .from('accounting_accounts')
          .select('*');
        
        if (error) {
          console.error('Error fetching accounts with Supabase client:', error);
          throw error;
        }
        
        accountsData = data;
      } catch (supabaseError) {
        // Fall back to direct fetch with settings from localStorage
        console.log('Trying direct fetch for accounts...');
        accountsData = await fetchTableData('accounting_accounts', settings.key, settings.url);
        
        // Check if direct fetch returned null (missing credentials)
        if (accountsData === null) {
          console.log('Direct fetch returned null - missing credentials');
          throw new Error('Missing Supabase credentials');
        }
      }
    } catch (error) {
      console.log('Using fallback accounts data');
      accountsData = fallbackData.accounts;
      usedFallback = true;
    }
    
    // Fetch balance sheets data
    try {
      try {
        // First try using the Supabase client with settings from localStorage
        const { data, error } = await supabaseClient
          .from('accounting_balance_sheets')
          .select('*');
        
        if (error) {
          console.error('Error fetching balance sheets with Supabase client:', error);
          throw error;
        }
        
        balanceSheetsData = data;
      } catch (supabaseError) {
        // Fall back to direct fetch with settings from localStorage
        console.log('Trying direct fetch for balance sheets...');
        balanceSheetsData = await fetchTableData('accounting_balance_sheets', settings.key, settings.url);
        
        // Check if direct fetch returned null (missing credentials)
        if (balanceSheetsData === null) {
          console.log('Direct fetch returned null - missing credentials');
          throw new Error('Missing Supabase credentials');
        }
      }
    } catch (error) {
      console.log('Using fallback balance sheets data');
      balanceSheetsData = fallbackData.balanceSheets;
      usedFallback = true;
    }

    // Fetch transactions data
    try {
      try {
        // First try using the Supabase client with settings from localStorage
        const { data, error } = await supabaseClient
          .from('accounting_transactions')
          .select('*')
          .limit(100); // Limit to avoid large data sets
        
        if (error) {
          console.error('Error fetching transactions with Supabase client:', error);
          throw error;
        }
        
        transactionsData = data;
      } catch (supabaseError) {
        // Fall back to direct fetch with settings from localStorage
        console.log('Trying direct fetch for transactions...');
        transactionsData = await fetchTableData('accounting_transactions', settings.key, settings.url);
        
        // Check if direct fetch returned null (missing credentials)
        if (transactionsData === null) {
          console.log('Direct fetch returned null - missing credentials');
          throw new Error('Missing Supabase credentials');
        }
      }
    } catch (error) {
      console.log('Using fallback transactions data');
      transactionsData = fallbackData.transactions;
      usedFallback = true;
    }
    
    // Return compiled financial data
    return {
      accounts: accountsData,
      balanceSheets: balanceSheetsData,
      transactions: transactionsData,
      usedFallback
    };
    
  } catch (error) {
    console.error('Error in fetchFinancialData:', error);
    // Return fallback data instead of throwing
    console.log('Using all fallback data due to error');
    return {
      accounts: fallbackData.accounts,
      balanceSheets: fallbackData.balanceSheets,
      transactions: fallbackData.transactions,
      usedFallback: true
    };
  }
}

/**
 * Gets a list of all available financial tables
 * @returns Array of table names
 */
export async function getFinancialTables() {
  try {
    // Get Supabase client with settings from localStorage
    const supabaseClient = createSupabaseClient();
    
    // First try using RPC if the function exists in the database
    try {
      const { data, error } = await supabaseClient.rpc('get_table_names');
      
      if (error) {
        console.error('Error fetching table names via RPC:', error);
        throw error;
      }
      
      // Filter only tables related to finance/accounting
      const financialTables = data
        .map((row: { tablename: string }) => row.tablename)
        .filter((name: string) => name.startsWith('accounting_') || name.startsWith('financial_'));
      
      return financialTables;
    } catch (rpcError) {
      console.log('RPC method not available, using direct method...');
      return await getAvailableTables();
    }
  } catch (error) {
    console.error('Error in getFinancialTables:', error);
    return getAvailableTables();
  }
} 