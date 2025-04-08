import { formatCurrency, formatRatio } from './dataProcessing';

/**
 * Generate data for financial charts based on processed balance sheets
 */
export function generateChartData(processedBalanceSheets: any[], interval: string = 'allDates') {
  if (!processedBalanceSheets || processedBalanceSheets.length === 0) {
    return null;
  }

  // Filter data based on the selected interval
  const filteredData = filterDataByInterval(processedBalanceSheets, interval);
  
  const sortedData = [...filteredData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Extract data for charts
  const dates = sortedData.map(item => formatDate(item.date));
  const totalAssets = sortedData.map(item => item.total_asset);
  const totalLiabilities = sortedData.map(item => item.total_liability);
  const totalEquities = sortedData.map(item => item.total_equity);
  const netIncomes = sortedData.map(item => item.net_income);

  // Extract ratio data
  const currentRatios = sortedData.map(item => item.ratios.current_ratio);
  const debtToEquityRatios = sortedData.map(item => item.ratios.debt_to_equity_ratio);
  const returnOnEquities = sortedData.map(item => item.ratios.return_on_equity);
  const equityMultipliers = sortedData.map(item => item.ratios.equity_multiplier);
  const debtRatios = sortedData.map(item => item.ratios.debt_ratio);
  const netProfitMargins = sortedData.map(item => item.ratios.net_profit_margin);

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
  
  // Format date parts
  const date = new Date(balanceSheet.date);
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
  
  return `# ${title}

## Balance Sheet Summary

**Total Assets:** ${formatCurrency(balanceSheet.total_asset)}
**Total Liabilities:** ${formatCurrency(balanceSheet.total_liability)}
**Total Equity:** ${formatCurrency(balanceSheet.total_equity)}
**Net Income:** ${formatCurrency(balanceSheet.net_income)}

## Financial Ratios

| Ratio | Value | Interpretation |
|-------|-------|----------------|
| Current Ratio | ${formatRatio(balanceSheet.ratios.current_ratio)} | ${interpretRatio('current_ratio', balanceSheet.ratios.current_ratio)} |
| Debt to Equity | ${formatRatio(balanceSheet.ratios.debt_to_equity_ratio)} | ${interpretRatio('debt_to_equity_ratio', balanceSheet.ratios.debt_to_equity_ratio)} |
| Return on Equity | ${formatRatio(balanceSheet.ratios.return_on_equity)} | ${interpretRatio('return_on_equity', balanceSheet.ratios.return_on_equity)} |
| Debt Ratio | ${formatRatio(balanceSheet.ratios.debt_ratio)} | ${interpretRatio('debt_ratio', balanceSheet.ratios.debt_ratio)} |

## Asset Breakdown

${balanceSheet.asset_breakdown.map((asset: any) => `- **${asset.name}**: ${formatCurrency(asset.value)}`).join('\n')}

## Summary

This report provides a ${getIntervalDescription(interval)} snapshot of the company's financial position. The company has total assets of ${formatCurrency(balanceSheet.total_asset)}, with liabilities of ${formatCurrency(balanceSheet.total_liability)} and equity of ${formatCurrency(balanceSheet.total_equity)}.

${getSummaryBasedOnRatios(balanceSheet.ratios)}

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
  const concerns = [];
  const strengths = [];
  
  // Check for concerns
  if (ratios.current_ratio < 1.2) {
    concerns.push('liquidity position may require attention');
  }
  
  if (ratios.debt_to_equity_ratio > 1.5) {
    concerns.push('high leverage level could pose financial risk');
  }
  
  if (ratios.return_on_equity < 0.08) {
    concerns.push('return on equity is below optimal levels');
  }
  
  // Check for strengths
  if (ratios.current_ratio > 2) {
    strengths.push('strong liquidity position');
  }
  
  if (ratios.return_on_equity > 0.15) {
    strengths.push('excellent return on shareholder investment');
  }
  
  if (ratios.debt_to_equity_ratio < 0.5) {
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