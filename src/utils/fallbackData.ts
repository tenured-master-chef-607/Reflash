/**
 * Fallback/demo data to show when Supabase connection fails
 */
export const fallbackData = {
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