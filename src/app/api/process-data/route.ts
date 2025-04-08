import { NextRequest, NextResponse } from 'next/server';
import { processData } from '@/utils/dataProcessor';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { tableName, column } = body;
    
    // Validate input
    if (!tableName || !column) {
      return NextResponse.json(
        { error: 'Table name and column are required' },
        { status: 400 }
      );
    }
    
    // Process the data using our utility
    const result = await processData(tableName, column);
    
    // Return the processed data
    return NextResponse.json(result);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to process data' },
      { status: 500 }
    );
  }
} 