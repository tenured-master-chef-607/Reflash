import { createServerSupabaseClient } from './supabaseServer';
import { getSupabaseServerSettings } from './supabaseServer';
import { fallbackData } from './fallbackData';

/**
 * Fetches available financial-related tables from Supabase
 */
export async function getFinancialTablesServer(): Promise<string[]> {
  const { url, key } = getSupabaseServerSettings();
  
  // If credentials are not available, return empty list
  if (!url || !key) {
    console.log('No Supabase credentials available, returning empty tables list');
    return [];
  }
  
  try {
    console.log('Fetching financial tables from Supabase...');
    
    // Create Supabase client to query tables
    const supabase = createServerSupabaseClient();
    
    // Get all tables ending with "accounts" or starting with "accounting_"
    const { data, error } = await supabase.rpc('get_table_names');
    
    if (error) {
      console.error('Error fetching tables via RPC:', error);
      return [];
    }
    
    // Filter tables to include only financial ones
    if (data) {
      // Check if data is array of objects with tablename property (Supabase format)
      const financialTables = data.map((item: any) => {
        // Handle both formats: string or {tablename: string}
        const tableName = typeof item === 'string' ? item : item.tablename;
        return tableName;
      }).filter((tableName: string) => 
        tableName && (
          tableName.endsWith('accounts') || 
          tableName.startsWith('accounting_') ||
          tableName.includes('financial') ||
          tableName.includes('finance_') ||
          tableName.includes('ledger') ||
          tableName.includes('transactions') ||
          tableName.includes('balance')
        )
      );
      
      console.log(`Found ${financialTables.length} financial tables`);
      return financialTables;
    }
    
    return [];
  } catch (error) {
    console.error('Error in getFinancialTablesServer:', error);
    return [];
  }
}

/**
 * Fetches financial data from Supabase tables
 * Returns fallback data if credentials are not available
 */
export async function fetchFinancialDataServer() {
  const { url, key } = getSupabaseServerSettings();
  
  // If credentials are not available, return fallback data
  if (!url || !key) {
    console.log('No Supabase credentials available, returning fallback data');
    return {
      accounts: fallbackData.accounts,
      balanceSheets: fallbackData.balanceSheets,
      transactions: fallbackData.transactions,
      usedFallback: true
    };
  }
  
  try {
    console.log('Fetching financial data from server...');
    
    // Create Supabase client
    const supabase = createServerSupabaseClient();
    
    // Get accounts data
    const { data: accounts, error: accountsError } = await supabase
      .from('accounting_accounts')
      .select('*');
      
    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return {
        accounts: fallbackData.accounts,
        balanceSheets: fallbackData.balanceSheets,
        transactions: fallbackData.transactions,
        usedFallback: true,
        error: `Error fetching accounts: ${accountsError.message}`
      };
    }
    
    // Get balance sheets data
    const { data: balanceSheets, error: balanceSheetsError } = await supabase
      .from('accounting_balance_sheets')
      .select('*')
      .order('date', { ascending: false });
      
    if (balanceSheetsError) {
      console.error('Error fetching balance sheets:', balanceSheetsError);
      return {
        accounts: accounts || fallbackData.accounts,
        balanceSheets: fallbackData.balanceSheets,
        transactions: fallbackData.transactions,
        usedFallback: true,
        error: `Error fetching balance sheets: ${balanceSheetsError.message}`
      };
    }
    
    // Get transactions data
    const { data: transactions, error: transactionsError } = await supabase
      .from('accounting_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return {
        accounts: accounts || fallbackData.accounts,
        balanceSheets: balanceSheets || fallbackData.balanceSheets,
        transactions: fallbackData.transactions,
        usedFallback: true,
        error: `Error fetching transactions: ${transactionsError.message}`
      };
    }

    // Get expense data
    const { data: rawExpenses, error: expensesError } = await supabase
      .from('accounting_expenses')
      .select('*');

    // Map raw expenses to the format expected by the application
    const expenses = rawExpenses?.map((exp: any) => ({
      id: exp.id,
      date: exp.transaction_date || exp.created_at,
      amount: exp.total_amount || 0,
      description: exp.memo || `Expense ${exp.id}`,
      category: exp.tracking_category_ids || 'Uncategorized'
    })) || [];
      
    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
      return {
        accounts: accounts || fallbackData.accounts,
        balanceSheets: balanceSheets || fallbackData.balanceSheets,
        transactions: transactions || fallbackData.transactions,
        expenses: expenses || fallbackData.expenses,
        usedFallback: true,
        error: `Error fetching expenses: ${expensesError.message}`
      };
    }
    
    // If any data is missing, use fallback
    if (!accounts || !balanceSheets || !transactions) {
      const useFallbackAccounts = !accounts;
      const useFallbackBalanceSheets = !balanceSheets;
      const useFallbackTransactions = !transactions;
      const useFallbackExpenses = !expenses;
      return {
        accounts: accounts || fallbackData.accounts,
        balanceSheets: balanceSheets || fallbackData.balanceSheets,
        transactions: transactions || fallbackData.transactions,
        expenses: expenses || fallbackData.expenses,
        usedFallback: useFallbackAccounts || useFallbackBalanceSheets || useFallbackTransactions,
        error: 'Some data was missing in the database'
      };
    }
    
    // Return the complete data
    return {
      accounts,
      balanceSheets,
      transactions,
      expenses,
      usedFallback: false
    };
  } catch (error) {
    console.error('Error in fetchFinancialDataServer:', error);
    return {
      accounts: fallbackData.accounts,
      balanceSheets: fallbackData.balanceSheets,
      transactions: fallbackData.transactions,
      expenses: fallbackData.expenses,
      usedFallback: true,
      error: `Server error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 