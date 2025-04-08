import { NextRequest, NextResponse } from 'next/server';
import { 
  processBalanceSheets, 
  findNearestBalanceSheet, 
  getAvailableDates, 
  getTransactionsForDateRange 
} from '@/utils/dataProcessing';
import { generateChartData, generateMarkdownReport } from '@/utils/visualization';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { balanceSheets, transactions, targetDate, interval = 'quarterToDate' } = body;
    
    if (!balanceSheets || !Array.isArray(balanceSheets) || balanceSheets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or missing balance sheets data'
      }, { status: 400 });
    }
    
    // Process all balance sheets
    const processedSheets = processBalanceSheets(balanceSheets);
    
    // Generate available dates
    const availableDates = getAvailableDates(balanceSheets);
    
    // If a target date is provided, find the nearest sheet and process it
    let targetSheet = null;
    let dateTransactions = null;
    
    if (targetDate && typeof targetDate === 'string') {
      targetSheet = findNearestBalanceSheet(balanceSheets, targetDate);
      
      // If we have transactions, filter by date range based on the selected interval
      if (transactions && Array.isArray(transactions)) {
        const targetDateObj = new Date(targetDate);
        let startDate = new Date(targetDateObj);
        let endDate = new Date(targetDateObj);
        
        // Set date range based on interval
        switch (interval) {
          case 'last30days':
            startDate.setDate(startDate.getDate() - 30);
            break;
          case 'lastQuarter':
          case 'quarterToDate':
            // Start of current quarter based on target date
            const month = targetDateObj.getMonth();
            const quarterStartMonth = Math.floor(month / 3) * 3;
            startDate = new Date(targetDateObj.getFullYear(), quarterStartMonth, 1);
            break;
          case 'yearToDate':
            startDate = new Date(targetDateObj.getFullYear(), 0, 1); // Jan 1st of target date's year
            break;
          case 'lastYear':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case '3years':
            startDate.setFullYear(startDate.getFullYear() - 3);
            break;
          case '5years':
            startDate.setFullYear(startDate.getFullYear() - 5);
            break;
          case '10years':
            startDate.setFullYear(startDate.getFullYear() - 10);
            break;
          case 'all':
          case 'allDates':
            // Use a wide range (e.g., 5 years before)
            startDate.setFullYear(startDate.getFullYear() - 5);
            break;
          default:
            // Default to 1 month before target date
            startDate.setMonth(startDate.getMonth() - 1);
        }
        
        dateTransactions = getTransactionsForDateRange(
          transactions, 
          startDate.toISOString(), 
          endDate.toISOString()
        );
      }
    }
    
    // Generate chart data from all sheets
    const chartData = generateChartData(processedSheets, interval);
    
    // Generate markdown report for the target sheet
    const markdownReport = targetSheet ? generateMarkdownReport(targetSheet, interval) : '';
    
    return NextResponse.json({
      success: true,
      availableDates,
      chartData,
      targetSheet,
      markdownReport,
      relatedTransactions: dateTransactions,
      interval: interval
    });
    
  } catch (error) {
    console.error('Error processing financial data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing financial data'
    }, { status: 500 });
  }
} 