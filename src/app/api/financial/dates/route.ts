import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerSettings } from '@/utils/supabaseServer';

// Fallback dates for testing when connection fails
const fallbackDates = ['2023-12-31', '2023-09-30', '2023-06-30', '2023-03-31'];

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching available financial dates...');
    
    // Check for credentials in headers first (these will be the most up-to-date)
    const headerUrl = request.headers.get('X-Supabase-URL');
    const headerKey = request.headers.get('X-Supabase-Key');
    
    // Get credentials from environment/cookies as fallback
    const { url: envUrl, key: envKey } = getSupabaseServerSettings();
    
    // Use header credentials if provided, otherwise use environment/cookies
    const url = headerUrl || envUrl;
    const key = headerKey || envKey;
    
    // If no credentials, immediately return fallback dates
    if (!url || !key) {
      console.log('No Supabase credentials available, returning fallback dates');
      return NextResponse.json({
        success: true,
        dates: fallbackDates,
        debug: {
          usedFallback: true,
          reason: 'no_credentials'
        }
      });
    }
    
    // Only import and use fetchFinancialDataServer when credentials exist
    const { fetchFinancialDataServer } = await import('@/utils/fetchFinancialDataServer');
    
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