import { NextRequest, NextResponse } from 'next/server';
import { getServerCredentials } from '../env-set/route';

/**
 * API route that shows credential format for debugging
 */
export async function GET(request: NextRequest) {
  try {
    // Get credentials for debugging
    const creds = getServerCredentials();
    
    // Return credentials in various formats for debugging
    return NextResponse.json({
      success: true,
      serverCredentials: {
        url: creds.url ? creds.url.substring(0, 20) + '...' : null,
        key: creds.key ? creds.key.substring(0, 5) + '...' + creds.key.slice(-3) : null,
        urlDecoded: creds.url ? decodeURIComponent(creds.url).substring(0, 20) + '...' : null,
        isUrlEncoded: creds.url ? creds.url.includes('%') : false,
        // Show character codes to debug encoding issues
        urlChars: creds.url ? Array.from(creds.url.substring(0, 20)).map(c => c.charCodeAt(0)) : []
      },
      envCredentials: {
        url: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) + '...' : null,
        key: process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.substring(0, 5) + '...' : null,
        nextPublicUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + '...' : null,
        isUrlEncoded: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.includes('%') : false,
      }
    });
  } catch (error) {
    console.error('Error in debug-credentials API route:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 