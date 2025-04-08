import { NextRequest, NextResponse } from 'next/server';

// Server-side storage for credentials that persists between requests
// Note: This is reset on server restart, but works for the duration of the session
let serverCredentials = {
  url: '',
  key: ''
};

/**
 * API route that sets server-side credentials
 * This allows client credentials to be made available to server components
 */
export async function POST(request: NextRequest) {
  try {
    // Get credentials from request body
    const body = await request.json();
    const { supabaseUrl, supabaseKey } = body;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase URL or key'
      }, { status: 400 });
    }
    
    // Ensure URLs are properly decoded before storing
    const decodedUrl = decodeURIComponent(supabaseUrl);
    const decodedKey = decodeURIComponent(supabaseKey);
    
    // Store credentials in server-side storage
    serverCredentials.url = decodedUrl;
    serverCredentials.key = decodedKey;
    
    console.log('Server credentials set:', 
      decodedUrl.substring(0, 10) + '...',
      decodedKey.substring(0, 3) + '...' + decodedKey.slice(-3)
    );
    
    // Set environment variables (these will be reset on server restart but work for the session)
    process.env.SUPABASE_URL = decodedUrl;
    process.env.NEXT_PUBLIC_SUPABASE_URL = decodedUrl;
    process.env.SUPABASE_KEY = decodedKey;
    process.env.NEXT_PUBLIC_SUPABASE_KEY = decodedKey;
    
    return NextResponse.json({
      success: true,
      message: 'Server credentials set successfully'
    });
  } catch (error) {
    console.error('Error setting server credentials:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error setting credentials'
    }, { status: 500 });
  }
}

/**
 * Get stored server credentials
 * This can be imported by server components to access credentials
 */
export function getServerCredentials() {
  return serverCredentials;
} 