import { NextRequest, NextResponse } from 'next/server';
import { 
  processBalanceSheets, 
  findNearestBalanceSheet, 
  getAvailableDates, 
  getTransactionsForDateRange 
} from '@/utils/dataProcessing';
import { generateChartData, generateMarkdownReport } from '@/utils/visualization';

// Fallback data when balance sheets are missing
const fallbackBalanceSheets = [
  { 
    id: 1, 
    date: new Date().toISOString().split('T')[0], 
    total_assets: 0, 
    total_liabilities: 0,
    total_equity: 0,
    current_ratio: 0
  }
];

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { balanceSheets, transactions, targetDate, interval = 'quarterToDate' } = body;
    
    // Handle missing or invalid balance sheets by using fallback data
    let sheetsToProcess = [];
    if (!balanceSheets || !Array.isArray(balanceSheets)) {
      console.warn('Missing or invalid balance sheets, using fallback data');
      sheetsToProcess = fallbackBalanceSheets;
    } else if (balanceSheets.length === 0) {
      console.warn('Empty balance sheets array, using fallback data');
      sheetsToProcess = fallbackBalanceSheets;
    } else {
      sheetsToProcess = balanceSheets;
    }
    
    // Process all balance sheets
    const processedSheets = processBalanceSheets(sheetsToProcess);
    
    // Generate available dates
    const availableDates = getAvailableDates(sheetsToProcess);
    
    // If a target date is provided, find the nearest sheet and process it
    let targetSheet = null;
    let dateTransactions = null;
    
    if (targetDate && typeof targetDate === 'string') {
      targetSheet = findNearestBalanceSheet(sheetsToProcess, targetDate);
      
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
    
    // Provide fallback chart data in case of error
    const fallbackChartData = {
      majorFinancials: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Revenue',
            data: [0, 0, 0, 0, 0, 0],
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.5)',
          },
          {
            label: 'Expenses',
            data: [0, 0, 0, 0, 0, 0],
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.5)',
          },
          {
            label: 'Profit',
            data: [0, 0, 0, 0, 0, 0],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
          }
        ]
      },
      ratios: {}
    };
    
    // Return an error but with fallback data to avoid breaking the UI
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing financial data',
      availableDates: [new Date().toISOString().split('T')[0]],
      chartData: fallbackChartData,
      targetSheet: null,
      markdownReport: '',
      relatedTransactions: [],
      interval: 'quarterToDate'
    }, { status: 200 }); // Status 200 so that UI can still display fallback data
  }
} 