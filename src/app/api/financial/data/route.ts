import { NextResponse } from 'next/server';
import { fetchFinancialDataServer, getFinancialTablesServer } from '@/utils/fetchFinancialDataServer';

// Fallback data for testing when connection fails
const fallbackTables = ['accounting_accounts', 'accounting_balance_sheets', 'accounting_transactions'];

export async function GET() {
  try {
    // Print env vars availability for debugging (not their values)
    // console.log('Environment variables check:');
    // console.log('SUPABASE_URL available:', !!process.env.SUPABASE_URL);
    // console.log('SUPABASE_KEY available:', !!process.env.SUPABASE_KEY);
    // console.log('NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    // console.log('NEXT_PUBLIC_SUPABASE_KEY available:', !!process.env.NEXT_PUBLIC_SUPABASE_KEY);

    let tables = [];
    let data = null;
    let usedFallbackTables = false;
    let usedFallbackData = false;

    try {
      // First get available tables for debugging purposes
      tables = await getFinancialTablesServer();
    } catch (tablesError) {
      console.error('Error fetching tables:', tablesError);
      tables = fallbackTables;
      usedFallbackTables = true;
    }
    
    try {
      // Then fetch the actual financial data
      data = await fetchFinancialDataServer();
      
      // Check if fallback data was used inside the fetch function
      if (data.usedFallback) {
        usedFallbackData = true;
        // Use type assertion to handle the property deletion
        const typedData = data as { usedFallback?: boolean };
        delete typedData.usedFallback;
      }
    } catch (dataError) {
      console.error('Error fetching financial data:', dataError);
      usedFallbackData = true;
    }
    
    // Return both the tables list and the fetched data
    return NextResponse.json({ 
      success: true, 
      tables,
      data,
      debug: {
        usedFallbackTables,
        usedFallbackData,
      }
    });
  } catch (error) {
    console.error('Error in financial data API route:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 