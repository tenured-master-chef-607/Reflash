import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerSettings } from '@/utils/supabaseServer';

/**
 * API route to create required Supabase tables
 */
export async function GET(request: NextRequest) {
  try {
    // Get credentials from server settings
    const { url, key } = getSupabaseServerSettings();
    
    if (!url || !key) {
      return NextResponse.json({
        success: false,
        message: 'No Supabase credentials found. Please enter your Supabase URL and API key in the settings page.',
      });
    }
    
    // Only import the module when credentials are available
    const { createRequiredTables } = await import('@/utils/createTables');
    
    // Create required tables
    const result = await createRequiredTables(url, key);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating tables:', error);
    return NextResponse.json({
      success: false,
      message: `Error creating tables: ${error instanceof Error ? error.message : String(error)}`
    });
  }
} 