import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerSettings } from '@/utils/supabaseServer';

/**
 * API route to check if server-side Supabase credentials are properly set
 */
export async function GET(request: NextRequest) {
  try {
    // Get credentials from server settings
    const { url, key } = await getSupabaseServerSettings();
    
    return NextResponse.json({
      success: true,
      settings: {
        url: url ? true : false, // Just return boolean for security
        key: key ? true : false,
      }
    });
  } catch (error) {
    console.error('Error checking server credentials:', error);
    return NextResponse.json({
      success: false,
      message: `Error checking server credentials: ${error instanceof Error ? error.message : String(error)}`
    });
  }
} 