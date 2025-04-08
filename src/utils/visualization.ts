import { formatCurrency, formatRatio } from './dataProcessing';

/**
 * Generate data for financial charts based on processed balance sheets
 */
export function generateChartData(processedBalanceSheets: any[], interval: string = 'allDates') {
  // Handle missing or empty data with fallback
  if (!processedBalanceSheets || !Array.isArray(processedBalanceSheets) || processedBalanceSheets.length === 0) {
    console.warn('No balance sheet data available for chart generation, using fallback');
    return createFallbackChartData();
  }

  // Filter data based on the selected interval
  const filteredData = filterDataByInterval(processedBalanceSheets, interval);
  
  // Handle case where filtering results in no data
  if (filteredData.length === 0) {
    console.warn('No data available for selected interval, using fallback');
    return createFallbackChartData();
  }
  
  const sortedData = [...filteredData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Extract data for charts - with safer property access
  const dates = sortedData.map(item => formatDate(item.date || new Date().toISOString()));
  const totalAssets = sortedData.map(item => item.total_asset || 0);
  const totalLiabilities = sortedData.map(item => item.total_liability || 0);
  const totalEquities = sortedData.map(item => item.total_equity || 0);
  const netIncomes = sortedData.map(item => item.net_income || 0);

  // Extract ratio data with default values if missing
  const getRatio = (item: any, ratioName: string) => {
    return (item.ratios && typeof item.ratios[ratioName] === 'number') 
      ? item.ratios[ratioName] 
      : 0;
  };
  
  const currentRatios = sortedData.map(item => getRatio(item, 'current_ratio'));
  const debtToEquityRatios = sortedData.map(item => getRatio(item, 'debt_to_equity_ratio'));
  const returnOnEquities = sortedData.map(item => getRatio(item, 'return_on_equity'));
  const equityMultipliers = sortedData.map(item => getRatio(item, 'equity_multiplier'));
  const debtRatios = sortedData.map(item => getRatio(item, 'debt_ratio'));
  const netProfitMargins = sortedData.map(item => getRatio(item, 'net_profit_margin'));

  // Major financials chart data
  const majorFinancialsData = {
    labels: dates,
    datasets: [
      {
        label: 'Total Assets',
        data: totalAssets,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1
      },
      {
        label: 'Total Liabilities',
        data: totalLiabilities,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.1
      },
      {
        label: 'Total Equity',
        data: totalEquities,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.1
      },
      {
        label: 'Net Income',
        data: netIncomes,
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        tension: 0.1
      }
    ]
  };

  // Create ratios data
  const makeRatioData = (label: string, data: number[], color: string) => ({
    labels: dates,
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: color.replace(')', ', 0.2)').replace('rgb', 'rgba'),
        tension: 0.1,
        fill: true
      }
    ]
  });

  // Return all chart data
  return {
    majorFinancials: majorFinancialsData,
    ratios: {
      currentRatio: makeRatioData('Current Ratio', currentRatios, 'rgb(59, 130, 246)'),
      debtToEquityRatio: makeRatioData('Debt to Equity Ratio', debtToEquityRatios, 'rgb(239, 68, 68)'),
      returnOnEquity: makeRatioData('Return on Equity', returnOnEquities, 'rgb(16, 185, 129)'),
      equityMultiplier: makeRatioData('Equity Multiplier', equityMultipliers, 'rgb(139, 92, 246)'),
      debtRatio: makeRatioData('Debt Ratio', debtRatios, 'rgb(245, 158, 11)'),
      netProfitMargin: makeRatioData('Net Profit Margin', netProfitMargins, 'rgb(6, 182, 212)')
    }
  };
}

/**
 * Create fallback chart data when no real data is available
 */
function createFallbackChartData() {
  const emptyDates = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const emptyData = [0, 0, 0, 0, 0, 0];
  
  const majorFinancialsData = {
    labels: emptyDates,
    datasets: [
      {
        label: 'Total Assets',
        data: emptyData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1
      },
      {
        label: 'Total Liabilities',
        data: emptyData,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.1
      },
      {
        label: 'Total Equity',
        data: emptyData,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.1
      },
      {
        label: 'Net Income',
        data: emptyData,
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        tension: 0.1
      }
    ]
  };
  
  // Create empty ratio data
  const makeEmptyRatioData = (label: string, color: string) => ({
    labels: emptyDates,
    datasets: [
      {
        label,
        data: emptyData,
        borderColor: color,
        backgroundColor: color.replace(')', ', 0.2)').replace('rgb', 'rgba'),
        tension: 0.1,
        fill: true
      }
    ]
  });
  
  return {
    majorFinancials: majorFinancialsData,
    ratios: {
      currentRatio: makeEmptyRatioData('Current Ratio', 'rgb(59, 130, 246)'),
      debtToEquityRatio: makeEmptyRatioData('Debt to Equity Ratio', 'rgb(239, 68, 68)'),
      returnOnEquity: makeEmptyRatioData('Return on Equity', 'rgb(16, 185, 129)'),
      equityMultiplier: makeEmptyRatioData('Equity Multiplier', 'rgb(139, 92, 246)'),
      debtRatio: makeEmptyRatioData('Debt Ratio', 'rgb(245, 158, 11)'),
      netProfitMargin: makeEmptyRatioData('Net Profit Margin', 'rgb(6, 182, 212)')
    }
  };
}

/**
 * Filter balance sheets based on the selected time interval
 */
function filterDataByInterval(data: any[], interval: string): any[] {
  if (!data || data.length === 0 || interval === 'allDates') {
    return data;
  }
  
  const now = new Date();
  let startDate = new Date();
  
  // Set the start date based on the selected interval
  switch (interval) {
    case 'last30days':
      startDate.setDate(now.getDate() - 30);
      break;
    case 'lastQuarter':
    case 'quarterToDate':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'ytd':
    case 'yearToDate':
      startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
      break;
    case 'lastYear':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case '3years':
      startDate.setFullYear(now.getFullYear() - 3);
      break;
    case '5years':
      startDate.setFullYear(now.getFullYear() - 5);
      break;
    case '10years':
      startDate.setFullYear(now.getFullYear() - 10);
      break;
    case 'all':
      // Set to a very old date to include all data
      startDate = new Date(1970, 0, 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30); // Default to last 30 days
  }
  
  // Filter data based on date range
  return data.filter(item => {
    if (!item || !item.date) {
      return false;
    }
    try {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= now;
    } catch (err) {
      console.error("Error parsing item date", item, err);
      return false;
    }
  });
}

/**
 * Format date for charts
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

/**
 * Generate a markdown report from the processed balance sheet data
 */
export function generateMarkdownReport(balanceSheet: any, interval: string = 'quarterToDate'): string {
  if (!balanceSheet) return '';
  
  // Ensure balance sheet has required properties
  const totalAsset = balanceSheet.total_asset || 0;
  const totalLiability = balanceSheet.total_liability || 0;
  const totalEquity = balanceSheet.total_equity || 0;
  const netIncome = balanceSheet.net_income || 0;
  
  // Ensure balance sheet has ratios
  const ratios = balanceSheet.ratios || {};
  
  // Format date parts
  const date = new Date(balanceSheet.date || new Date());
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  
  // Create title based on interval
  let title = '';
  switch (interval) {
    case 'last30days':
      title = `Last 30 Days (as of ${month} ${date.getDate()}, ${year})`;
      break;
    case 'quarterToDate':
      title = `Q${quarter} ${year} Financial Report`;
      break;
    case 'yearToDate':
      title = `Year-to-Date Financial Report (as of ${month} ${date.getDate()}, ${year})`;
      break;
    case 'allDates':
      title = `Comprehensive Financial Report (as of ${month} ${date.getDate()}, ${year})`;
      break;
    default:
      title = `${month} ${year} Financial Report`;
  }

  // Safely get ratio values
  const currentRatio = ratios.current_ratio || 0;
  const debtToEquityRatio = ratios.debt_to_equity_ratio || 0;
  const returnOnEquity = ratios.return_on_equity || 0;
  const debtRatio = ratios.debt_ratio || 0;
  
  // Safely handle asset breakdown
  const assetBreakdown = Array.isArray(balanceSheet.asset_breakdown) 
    ? balanceSheet.asset_breakdown 
    : [];
  
  return `# ${title}

## Balance Sheet Summary

**Total Assets:** ${formatCurrency(totalAsset)}
**Total Liabilities:** ${formatCurrency(totalLiability)}
**Total Equity:** ${formatCurrency(totalEquity)}
**Net Income:** ${formatCurrency(netIncome)}

## Financial Ratios

| Ratio | Value | Interpretation |
|-------|-------|----------------|
| Current Ratio | ${formatRatio(currentRatio)} | ${interpretRatio('current_ratio', currentRatio)} |
| Debt to Equity | ${formatRatio(debtToEquityRatio)} | ${interpretRatio('debt_to_equity_ratio', debtToEquityRatio)} |
| Return on Equity | ${formatRatio(returnOnEquity)} | ${interpretRatio('return_on_equity', returnOnEquity)} |
| Debt Ratio | ${formatRatio(debtRatio)} | ${interpretRatio('debt_ratio', debtRatio)} |

## Asset Breakdown

${assetBreakdown.map((asset: any) => `- **${asset.name || 'Asset'}**: ${formatCurrency(asset.value || 0)}`).join('\n')}

## Summary

This report provides a ${getIntervalDescription(interval)} snapshot of the company's financial position. The company has total assets of ${formatCurrency(totalAsset)}, with liabilities of ${formatCurrency(totalLiability)} and equity of ${formatCurrency(totalEquity)}.

${getSummaryBasedOnRatios(ratios)}

For a more detailed analysis, please consult the AI-generated insights.
`;
}

/**
 * Get a description for the time interval
 */
function getIntervalDescription(interval: string): string {
  switch (interval) {
    case 'last30days':
      return 'short-term (30-day)';
    case 'lastQuarter':
    case 'quarterToDate':
      return 'quarterly';
    case 'yearToDate':
      return 'year-to-date';
    case 'lastYear':
      return 'annual';
    case '3years':
      return '3-year';
    case '5years':
      return '5-year';
    case '10years':
      return '10-year';
    case 'all':
    case 'allDates':
      return 'comprehensive';
    default:
      return 'monthly';
  }
}

/**
 * Provide interpretation for financial ratios
 */
function interpretRatio(ratioName: string, value: number): string {
  switch (ratioName) {
    case 'current_ratio':
      if (value < 1) return 'Poor liquidity position';
      if (value < 1.5) return 'Acceptable liquidity';
      if (value < 3) return 'Good liquidity position';
      return 'Excellent liquidity, possibly underutilized assets';
    
    case 'debt_to_equity_ratio':
      if (value < 0.3) return 'Low leverage, conservative financing';
      if (value < 1) return 'Moderate and sustainable leverage';
      if (value < 2) return 'High leverage, potential risk';
      return 'Very high leverage, significant financial risk';
    
    case 'return_on_equity':
      if (value < 0.05) return 'Poor return for shareholders';
      if (value < 0.1) return 'Acceptable return';
      if (value < 0.2) return 'Good return on equity';
      return 'Excellent return for shareholders';
    
    case 'debt_ratio':
      if (value < 0.3) return 'Low debt level, conservative';
      if (value < 0.5) return 'Moderate debt level';
      if (value < 0.7) return 'High debt level, monitor carefully';
      return 'Very high debt level, potential risk';
    
    default:
      return 'No interpretation available';
  }
}

/**
 * Generate a summary based on financial ratios
 */
function getSummaryBasedOnRatios(ratios: any): string {
  // Ensure ratios object exists
  ratios = ratios || {};
  
  const concerns = [];
  const strengths = [];
  
  // Get ratios with defaults for missing values
  const currentRatio = typeof ratios.current_ratio === 'number' ? ratios.current_ratio : 0;
  const debtToEquityRatio = typeof ratios.debt_to_equity_ratio === 'number' ? ratios.debt_to_equity_ratio : 0;
  const returnOnEquity = typeof ratios.return_on_equity === 'number' ? ratios.return_on_equity : 0;
  
  // Check for concerns
  if (currentRatio < 1.2) {
    concerns.push('liquidity position may require attention');
  }
  
  if (debtToEquityRatio > 1.5) {
    concerns.push('high leverage level could pose financial risk');
  }
  
  if (returnOnEquity < 0.08) {
    concerns.push('return on equity is below optimal levels');
  }
  
  // Check for strengths
  if (currentRatio > 2) {
    strengths.push('strong liquidity position');
  }
  
  if (returnOnEquity > 0.15) {
    strengths.push('excellent return on shareholder investment');
  }
  
  if (debtToEquityRatio < 0.5) {
    strengths.push('conservative debt management');
  }
  
  // Create the summary text
  let summary = '';
  
  if (strengths.length > 0) {
    summary += `The company demonstrates ${strengths.join(', and ')}.`;
  }
  
  if (concerns.length > 0) {
    if (summary) summary += ' However, ';
    else summary += 'The company should address several concerns: ';
    
    summary += concerns.join(', and ') + '.';
  }
  
  if (!summary) {
    summary = 'The company shows balanced financial performance with no significant concerns or exceptional strengths.';
  }
  
  return summary;
} 