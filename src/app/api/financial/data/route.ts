import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerSettings } from '@/utils/supabaseServer';
import { fallbackData } from '@/utils/fallbackData';

// Fallback tables for listing in responses
const fallbackTables = ['accounting_accounts', 'accounting_balance_sheets', 'accounting_transactions'];

// Cache control headers
const CACHE_CONTROL_FALLBACK = 'public, max-age=10, s-maxage=10';
const CACHE_CONTROL_REAL = 'public, max-age=300, s-maxage=300';

export async function GET(request: NextRequest) {
  // Check for credentials in headers first (these will be the most up-to-date)
  const headerUrl = request.headers.get('X-Supabase-URL');
  const headerKey = request.headers.get('X-Supabase-Key');
  
  // Get credentials from environment/cookies as fallback
  const { url: envUrl, key: envKey } = getSupabaseServerSettings();
  
  // Use header credentials if provided, otherwise use environment/cookies
  const url = headerUrl || envUrl;
  const key = headerKey || envKey;
  
  // If credentials are not set, return fallback data immediately
  if (!url || !key) {
    console.log('Supabase credentials not provided, returning fallback data');
    return NextResponse.json({
      success: true,
      data: fallbackData,
      tables: fallbackTables,
      debug: {
        usedFallbackData: true,
        errorType: 'missing_credentials',
        errorMessage: 'Supabase credentials not provided. Using demo data.'
      }
    }, {
      headers: {
        'X-Supabase-Status': 'not-configured',
        'Cache-Control': CACHE_CONTROL_FALLBACK
      }
    });
  }
  
  try {
    // Import this only when credentials are provided to prevent unnecessary initialization
    const { fetchFinancialDataServer, getFinancialTablesServer } = await import('@/utils/fetchFinancialDataServer');
    
    // Get tables list
    let tables = [];
    try {
      tables = await getFinancialTablesServer();
    } catch (e) {
      console.error('Error fetching tables:', e);
      tables = fallbackTables;
    }
    
    // Get financial data
    const financialData = await fetchFinancialDataServer();
    
    // Check if we got real data or fallback was used
    if (financialData.usedFallback) {
      return NextResponse.json({
        success: true,
        data: financialData,
        tables,
        debug: {
          usedFallbackData: true,
          errorType: 'data_error',
          errorMessage: 'Failed to fetch data from database. Using demo data.'
        }
      }, {
        headers: {
          'Cache-Control': CACHE_CONTROL_FALLBACK
        }
      });
    }
    
    // Return real data
    return NextResponse.json({
      success: true,
      data: financialData,
      tables,
    }, {
      headers: {
        'Cache-Control': CACHE_CONTROL_REAL
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json({
      success: true, // Still consider API call a success for UI purposes
      data: fallbackData,
      tables: fallbackTables,
      debug: {
        usedFallbackData: true,
        errorType: 'api_error',
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    }, {
      headers: {
        'Cache-Control': CACHE_CONTROL_FALLBACK
      }
    });
  }
} 