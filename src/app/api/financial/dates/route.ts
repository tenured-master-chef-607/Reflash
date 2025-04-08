import { NextResponse } from 'next/server';
import { fetchFinancialDataServer } from '@/utils/fetchFinancialDataServer';

// Fallback dates for testing when connection fails
const fallbackDates = ['2023-12-31', '2023-09-30', '2023-06-30', '2023-03-31'];

export async function GET() {
  try {
    console.log('Fetching available financial dates...');
    
    // Fetch the financial data to get balance sheet dates
    const financialData = await fetchFinancialDataServer();
    
    let dates: string[] = [];
    let usedFallback = false;
    
    // Extract dates from balance sheets if available
    if (financialData && financialData.balanceSheets && financialData.balanceSheets.length > 0) {
      dates = financialData.balanceSheets
        .map((sheet: any) => sheet.date)
        .filter((date: string) => date) // Filter out empty dates
        .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime()); // Sort newest first
    } else {
      // Use fallback dates if no real data is available
      dates = fallbackDates;
      usedFallback = true;
    }
    
    // Return the dates
    return NextResponse.json({
      success: true,
      dates,
      debug: {
        usedFallback
      }
    });
  } catch (error) {
    console.error('Error fetching financial dates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        dates: fallbackDates,
        debug: {
          usedFallback: true
        }
      },
      { status: 500 }
    );
  }
} 