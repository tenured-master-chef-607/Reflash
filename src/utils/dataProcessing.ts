/**
 * Converts a balance sheet object to a standardized format for visualization and analysis
 */
export function processBalanceSheet(balanceSheet: any) {
  // If the balance sheet is already in our standardized format, return it directly
  if (balanceSheet && 
      typeof balanceSheet === 'object' &&
      balanceSheet.total_asset !== undefined &&
      balanceSheet.total_liability !== undefined &&
      balanceSheet.total_equity !== undefined &&
      balanceSheet.asset_breakdown !== undefined &&
      balanceSheet.liability_breakdown !== undefined &&
      balanceSheet.equity_breakdown !== undefined) {
    
    console.log('Balance sheet already in standardized format');
    
    // Make sure ratios are present, calculate if missing
    if (!balanceSheet.ratios) {
      const totalAssets = balanceSheet.total_asset || 1;
      const totalLiabilities = balanceSheet.total_liability || 1;
      const totalEquity = balanceSheet.total_equity || 1;
      const netIncome = balanceSheet.net_income || 0;
      
      balanceSheet.ratios = {
        current_ratio: totalAssets / totalLiabilities,
        debt_to_equity_ratio: totalLiabilities / totalEquity,
        return_on_equity: netIncome / totalEquity,
        equity_multiplier: totalAssets / totalEquity,
        debt_ratio: totalLiabilities / totalAssets,
        net_profit_margin: netIncome / totalAssets
      };
    }
    
    return balanceSheet;
  }
  
  // Handle null or undefined balance sheet
  if (!balanceSheet) {
    console.warn('Null or undefined balance sheet provided, returning default structure');
    return getDefaultBalanceSheet();
  }
  
  // Process from raw format
  const date = balanceSheet.date || new Date().toISOString().split('T')[0];
  
  // Handle both raw data types (report_json structure or direct breakdowns)
  let assetBreakdown, liabilityBreakdown, equityBreakdown;
  let totalAssets, totalLiabilities, totalEquity, netIncome;
  
  // If balance sheet has report_json structure
  if (balanceSheet.report_json) {
    const reportJson = balanceSheet.report_json || {};
    const assets = reportJson.assets?.[0] || {};
    const liabilities = reportJson.liabilities?.[0] || {};
    const equity = reportJson.equity?.[0] || {};

    assetBreakdown = (assets.sub_items || []).map((item: any) => ({
      name: item.name,
      value: item.value || 0
    }));

    liabilityBreakdown = (liabilities.sub_items || []).map((item: any) => ({
      name: item.name,
      value: item.value || 0
    }));

    equityBreakdown = (equity.sub_items || []).map((item: any) => ({
      name: item.name,
      value: item.value || 0
    }));

    totalAssets = assets.value || balanceSheet.total_asset || 1;
    totalLiabilities = liabilities.value || balanceSheet.total_liability || 1;
    totalEquity = equity.value || balanceSheet.total_equity || 1;
    
    netIncome = (equity.sub_items || []).find((item: any) => 
      item.name === "Net Income")?.value || balanceSheet.net_income || 0;
  } 
  // If balance sheet already has breakdown arrays
  else if (Array.isArray(balanceSheet.asset_breakdown) || 
           Array.isArray(balanceSheet.liability_breakdown) || 
           Array.isArray(balanceSheet.equity_breakdown)) {
    
    assetBreakdown = (balanceSheet.asset_breakdown || []).map((item: any) => ({
      name: item.name,
      value: item.value || 0
    }));
    
    liabilityBreakdown = (balanceSheet.liability_breakdown || []).map((item: any) => ({
      name: item.name,
      value: item.value || 0
    }));
    
    equityBreakdown = (balanceSheet.equity_breakdown || []).map((item: any) => ({
      name: item.name,
      value: item.value || 0
    }));
    
    // Extract totals
    totalAssets = balanceSheet.total_asset || 
      assetBreakdown.reduce((sum: number, item: any) => sum + (item.value || 0), 0) || 1;
    
    totalLiabilities = balanceSheet.total_liability || 
      liabilityBreakdown.reduce((sum: number, item: any) => sum + (item.value || 0), 0) || 1;
    
    totalEquity = balanceSheet.total_equity || 
      equityBreakdown.reduce((sum: number, item: any) => sum + (item.value || 0), 0) || 1;
    
    netIncome = balanceSheet.net_income || 
      equityBreakdown.find((item: any) => item.name === "Net Income")?.value || 0;
  }
  // Fallback to default values if no recognizable structure
  else {
    console.warn('Unrecognized balance sheet structure, using default values');
    const defaultSheet = getDefaultBalanceSheet();
    
    assetBreakdown = defaultSheet.asset_breakdown;
    liabilityBreakdown = defaultSheet.liability_breakdown;
    equityBreakdown = defaultSheet.equity_breakdown;
    
    totalAssets = defaultSheet.total_asset;
    totalLiabilities = defaultSheet.total_liability;
    totalEquity = defaultSheet.total_equity;
    netIncome = defaultSheet.net_income;
  }
  
  // Calculate financial ratios
  const ratios = balanceSheet.ratios || {
    current_ratio: totalAssets / totalLiabilities,
    debt_to_equity_ratio: totalLiabilities / totalEquity,
    return_on_equity: netIncome / totalEquity,
    equity_multiplier: totalAssets / totalEquity,
    debt_ratio: totalLiabilities / totalAssets,
    net_profit_margin: netIncome / totalAssets
  };

  // Return standardized structure
  return {
    date,
    total_asset: totalAssets,
    asset_breakdown: assetBreakdown,
    total_liability: totalLiabilities,
    liability_breakdown: liabilityBreakdown,
    total_equity: totalEquity,
    equity_breakdown: equityBreakdown,
    net_income: netIncome,
    ratios
  };
}

/**
 * Create a default balance sheet for handling edge cases
 */
function getDefaultBalanceSheet() {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    date: today,
    total_asset: 150000,
    asset_breakdown: [
      { name: 'Cash', value: 50000 },
      { name: 'Accounts Receivable', value: 25000 },
      { name: 'Inventory', value: 45000 },
      { name: 'Property & Equipment', value: 30000 }
    ],
    total_liability: 60000,
    liability_breakdown: [
      { name: 'Accounts Payable', value: 20000 },
      { name: 'Short-term Debt', value: 15000 },
      { name: 'Long-term Debt', value: 25000 }
    ],
    total_equity: 90000,
    equity_breakdown: [
      { name: 'Common Stock', value: 50000 },
      { name: 'Retained Earnings', value: 25000 },
      { name: 'Net Income', value: 15000 }
    ],
    net_income: 15000,
    ratios: {
      current_ratio: 2.5,
      debt_to_equity_ratio: 0.67,
      return_on_equity: 0.167,
      equity_multiplier: 1.67,
      debt_ratio: 0.4,
      net_profit_margin: 0.15
    }
  };
}

/**
 * Process all balance sheets and return them in a standardized format
 */
export function processBalanceSheets(balanceSheets: any[]) {
  return balanceSheets.map(sheet => processBalanceSheet(sheet));
}

/**
 * Find the nearest balance sheet to a target date
 */
export function findNearestBalanceSheet(balanceSheets: any[], targetDate: string) {
  if (!balanceSheets || balanceSheets.length === 0) {
    return null;
  }

  const processedSheets = processBalanceSheets(balanceSheets);
  
  // Convert target date to timestamp for comparison
  const targetTimestamp = new Date(targetDate).getTime();
  
  // Map the dates to timestamps for easy comparison
  const dateTimestamps = processedSheets.map(sheet => new Date(sheet.date).getTime());
  
  // Check if exact match exists
  const exactMatchIndex = dateTimestamps.findIndex(timestamp => timestamp === targetTimestamp);
  if (exactMatchIndex !== -1) {
    return processedSheets[exactMatchIndex];
  }
  
  // Find the nearest date
  let nearestIndex = 0;
  let minDifference = Math.abs(dateTimestamps[0] - targetTimestamp);
  
  for (let i = 1; i < dateTimestamps.length; i++) {
    const difference = Math.abs(dateTimestamps[i] - targetTimestamp);
    if (difference < minDifference) {
      minDifference = difference;
      nearestIndex = i;
    }
  }
  
  return processedSheets[nearestIndex];
}

/**
 * Generate available dates from balance sheets
 */
export function getAvailableDates(balanceSheets: any[]) {
  if (!balanceSheets || balanceSheets.length === 0) {
    return [];
  }
  
  return balanceSheets
    .map(sheet => sheet.date)
    .filter(date => date) // Filter out any null/undefined dates
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Sort newest to oldest
}

/**
 * Process transactions related to a specific date range
 */
export function getTransactionsForDateRange(transactions: any[], startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  return transactions.filter(transaction => {
    // Try to get date from either date field or created_at as fallback
    const dateValue = transaction.date || transaction.created_at;
    if (!dateValue) {
      console.warn("Transaction missing both date and created_at fields", transaction);
      return false;
    }
    
    const transactionDate = new Date(dateValue).getTime();
    return transactionDate >= start && transactionDate <= end;
  });
}

/**
 * Format currency value
 */
export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format ratio value
 */
export function formatRatio(value: number) {
  return value.toFixed(2);
} 