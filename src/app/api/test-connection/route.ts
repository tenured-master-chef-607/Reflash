import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerSettings } from '@/utils/supabaseServer';

/**
 * API route to test Supabase connectivity
 * This performs a basic connection test
 */
export async function GET(request: NextRequest) {
  try {
    // Get credentials from server settings
    const { url, key } = getSupabaseServerSettings();
    
    if (!url || !key) {
      return NextResponse.json({
        success: false,
        message: 'No Supabase credentials found. Please enter your credentials in the Settings page.',
        tests: {
          credentialsFound: false,
          basicConnectionTest: false
        }
      });
    }
    
    // Only import the test function when credentials are available
    const { testSupabaseConnectionServer } = await import('@/utils/serverTables');
    
    // Basic connection test
    const connectionResult = await testSupabaseConnectionServer(url, key);
    
    // Put together all test results
    return NextResponse.json({
      success: connectionResult.success,
      message: connectionResult.message,
      tests: {
        credentialsFound: true,
        basicConnectionTest: connectionResult.success,
        url: url.substring(0, 15) + '...',
        keyPreview: key.substring(0, 5) + '...' + key.slice(-3),
        errorDetails: {
          basicTest: connectionResult.success ? null : connectionResult.message
        }
      },
      connectionResult
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Error testing connection: ${error instanceof Error ? error.message : String(error)}`,
      tests: {
        credentialsFound: true,
        basicConnectionTest: false,
        errorDetails: {
          basicTest: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      }
    });
  }
} 