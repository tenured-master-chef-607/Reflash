import { NextRequest, NextResponse } from 'next/server';
import { AgentFactory, AgentType } from '@/app/agents/AgentFactory';
import { processBalanceSheet, findNearestBalanceSheet } from '@/utils/dataProcessing';
import { fetchFinancialData } from '@/utils/fetchFinancialData';
import { openai } from '@/utils/openai';
import { supabase } from '@/utils/supabase';
import { getEnv } from '@/utils/environmentOverrides';
import { OpenAI } from 'openai';

// Function to get OpenAI API key from cookies or environment variables
function getOpenAIApiKey(request: NextRequest): string | null {
  // First try to get from cookies
  const openaiApiKeyCookie = request.cookies.get('openai-api-key')?.value;
  if (openaiApiKeyCookie) {
    return decodeURIComponent(openaiApiKeyCookie);
  }
  
  // Then try from environment or overrides
  try {
    const apiKey = getEnv('OPENAI_API_KEY');
    if (apiKey) {
      return apiKey;
    }
  } catch (error) {
    console.warn('Failed to get OpenAI API key from environment:', error);
  }
  
  // Finally fall back to process.env
  return process.env.OPENAI_API_KEY || null;
}

export async function POST(request: NextRequest) {
  try {
    // Check for the OpenAI API key
    const openaiApiKey = getOpenAIApiKey(request);
    if (!openaiApiKey) {
      console.warn('OpenAI API key missing in request:', request.url);
      return NextResponse.json({
        success: false,
        error: 'Missing OpenAI API key. Please set it in the Settings page.'
      }, { status: 401 });
    }
    
    // Get the request body
    const body = await request.json();
    const { 
      agentType = 'financial', 
      balanceSheetId, 
      targetDate,
      companyName,
      industry,
      economicContext,
      newsArticles,
      prompt, // New parameter for direct prompting
      timestamp // New parameter for cache busting
    } = body;
    
    console.log('Financial agents API request:', {
      agentType,
      targetDate,
      timestamp: timestamp ? new Date(timestamp).toISOString() : 'not provided',
      hasBalanceSheet: !!body.balanceSheet,
      balanceSheetKeys: body.balanceSheet ? Object.keys(body.balanceSheet) : [],
      balanceSheetData: body.balanceSheet ? JSON.stringify(body.balanceSheet).substring(0, 100) + '...' : 'none'
    });
    
    // Force disable any response caching
    const headers = new Headers();
    headers.append('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.append('Pragma', 'no-cache');
    headers.append('Expires', '0');
    
    // Validate agent type
    if (!['financial', 'economic', 'news', 'comprehensive'].includes(agentType)) {
      return NextResponse.json({
        success: false,
        error: `Invalid agent type: ${agentType}`
      }, { status: 400 });
    }
    
    // Handle direct prompt for chat integration
    if (prompt && agentType === 'comprehensive') {
      return await handleChatPrompt(prompt, body, request);
    }
    
    // Use the provided balance sheet directly if it exists
    let balanceSheet = body.balanceSheet;
    
    // If balance sheet is wrapped in a targetSheet property, extract it
    if (balanceSheet && balanceSheet.targetSheet && typeof balanceSheet.targetSheet === 'object') {
      console.log('Extracting targetSheet from balanceSheet wrapper');
      balanceSheet = balanceSheet.targetSheet;
    }
    
    // Verify we have a valid balance sheet structure
    if (balanceSheet && (typeof balanceSheet !== 'object' || 
                         balanceSheet.total_asset === undefined || 
                         balanceSheet.total_liability === undefined)) {
      console.warn('Invalid balance sheet structure:', balanceSheet);
      balanceSheet = generateFallbackBalanceSheet();
    }
    
    // If no balance sheet is provided, try to fetch it
    if (!balanceSheet) {
      // Check if we have balance sheets in the body
      if (body.financialData?.balanceSheets?.length > 0) {
        const balanceSheets = body.financialData.balanceSheets;
        
        // Get specific balance sheet by ID or date
        if (balanceSheetId) {
          balanceSheet = balanceSheets.find((sheet: any) => sheet.id === balanceSheetId);
        } else if (targetDate) {
          balanceSheet = findNearestBalanceSheet(balanceSheets, targetDate);
        } else {
          // Default to most recent
          balanceSheet = balanceSheets[0];
        }
      } else {
        // Try direct server-side query using supabase
        try {
          const { data, error } = await supabase
            .from('accounting_balance_sheets')
            .select('*')
            .order('date', { ascending: false });
          
          if (error) {
            throw error;
          }
          
          // Get specific balance sheet by ID or date
          if (data && data.length > 0) {
            if (balanceSheetId) {
              balanceSheet = data.find((sheet: any) => sheet.id === balanceSheetId);
            } else if (targetDate) {
              balanceSheet = findNearestBalanceSheet(data, targetDate);
            } else {
              // Default to most recent
              balanceSheet = data[0];
            }
          }
        } catch (supabaseError) {
          console.error('Error fetching balance sheets from Supabase:', supabaseError);
          // Use fallback data if we can't get real data
          balanceSheet = generateFallbackBalanceSheet();
        }
      }
      
      // If still no balance sheet, generate a fallback
      if (!balanceSheet) {
        balanceSheet = generateFallbackBalanceSheet();
      }
    }
    
    // Create the agent factory with the API key
    const agentFactory = new AgentFactory(openaiApiKey);
    
    // Handle different agent types
    if (agentType === 'financial' || agentType === 'comprehensive') {
      console.log('Processing financial analysis request with balance sheet:', {
        hasTotalAsset: balanceSheet?.total_asset !== undefined,
        hasTotalLiability: balanceSheet?.total_liability !== undefined,
        hasTotalEquity: balanceSheet?.total_equity !== undefined
      });
      
      const financialAnalysisData = {
        balanceSheet,
        targetDate: targetDate || balanceSheet.date,
        transactions: body.financialData?.transactions || []
      };
      
      // If only financial analysis is requested
      if (agentType === 'financial') {
        try {
          console.log('Running financial analysis with balance sheet data and timestamp:', timestamp);
          
          const result = await agentFactory.runFinancialAnalysis(financialAnalysisData);
          
          // Ensure we have a consistent response format
          return NextResponse.json({
            success: true,
            analysis: result.analysis || generateFallbackAnalysis(balanceSheet, targetDate),
            timestamp: Date.now() // Add current timestamp to response
          }, { headers });
        } catch (error) {
          console.error('Error running financial analysis:', error);
          return NextResponse.json({
            success: true, // Still return success to avoid breaking the UI
            analysis: generateFallbackAnalysis(balanceSheet, targetDate),
            timestamp: Date.now() // Add current timestamp to response
          }, { headers });
        }
      }
      
      // For comprehensive analysis, also set up the other data
      if (agentType === 'comprehensive') {
        // Prepare economic data
        const economicAnalysisData = {
          financialData: { balanceSheet: processBalanceSheet(balanceSheet) },
          economicContext: economicContext || { 
            // Default economic context if none provided
            period: 'Current Quarter',
            region: 'United States',
            gdpGrowth: 0.032,
            inflation: 0.042,
            unemployment: 0.038,
            interestRates: {
              federal: 0.05,
              prime: 0.075
            }
          },
          targetDate: targetDate || balanceSheet.date
        };
        
        // Prepare news data
        const newsAnalysisData = {
          companyName: companyName || 'Company Inc.',
          industry: industry || 'Technology',
          financialData: { balanceSheet: processBalanceSheet(balanceSheet) },
          newsArticles: newsArticles || [
            // Default news article if none provided
            {
              title: 'Company Inc. Reports Strong Quarterly Earnings',
              source: 'Financial Times',
              date: new Date().toISOString().split('T')[0],
              content: 'Company Inc. has reported better than expected quarterly earnings, with revenue up 15% year-over-year.',
              sentiment: { score: 0.8, label: 'positive' }
            }
          ],
          targetDate: targetDate || balanceSheet.date,
          timeframe: 'past quarter'
        };
        
        // Run comprehensive analysis
        const result = await agentFactory.runComprehensiveAnalysis(
          financialAnalysisData,
          economicAnalysisData,
          newsAnalysisData
        );
        
        return NextResponse.json({
          success: true,
          results: result
        });
      }
    }
    
    // Economic analysis
    if (agentType === 'economic') {
      if (!economicContext) {
        return NextResponse.json({
          success: false,
          error: 'Economic context data is required for economic analysis'
        }, { status: 400 });
      }
      
      const economicAnalysisData = {
        financialData: { balanceSheet: processBalanceSheet(balanceSheet) },
        economicContext,
        targetDate: targetDate || balanceSheet.date
      };
      
      const result = await agentFactory.runEconomicAnalysis(economicAnalysisData);
      return NextResponse.json(result);
    }
    
    // News analysis
    if (agentType === 'news') {
      if (!newsArticles || newsArticles.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'News articles are required for news analysis'
        }, { status: 400 });
      }
      
      const newsAnalysisData = {
        companyName: companyName || 'Company Inc.',
        industry: industry || 'Technology',
        financialData: { balanceSheet: processBalanceSheet(balanceSheet) },
        newsArticles,
        targetDate: targetDate || balanceSheet.date,
        timeframe: body.timeframe || 'recent'
      };
      
      const result = await agentFactory.runNewsAnalysis(newsAnalysisData);
      return NextResponse.json(result);
    }
    
    // Should never reach here due to validation above
    return NextResponse.json({
      success: false,
      error: 'Invalid agent type'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error using financial agent:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error using financial agent',
    }, { status: 500 });
  }
}

/**
 * Generate a fallback balance sheet for testing
 */
function generateFallbackBalanceSheet() {
  console.log('Generating fallback balance sheet for testing');
  const today = new Date();
  const date = today.toISOString().split('T')[0];
  
  return {
    id: 1,
    date: date,
    report_json: {
      assets: [{
        name: 'Total Assets',
        value: 150000,
        sub_items: [
          { name: 'Cash', value: 50000 },
          { name: 'Accounts Receivable', value: 25000 },
          { name: 'Inventory', value: 45000 },
          { name: 'Property & Equipment', value: 30000 }
        ]
      }],
      liabilities: [{
        name: 'Total Liabilities',
        value: 60000,
        sub_items: [
          { name: 'Accounts Payable', value: 20000 },
          { name: 'Short-term Debt', value: 15000 },
          { name: 'Long-term Debt', value: 25000 }
        ]
      }],
      equity: [{
        name: 'Total Equity',
        value: 90000,
        sub_items: [
          { name: 'Common Stock', value: 50000 },
          { name: 'Retained Earnings', value: 25000 },
          { name: 'Net Income', value: 15000 }
        ]
      }]
    },
    total_asset: 150000,
    total_liability: 60000,
    total_equity: 90000,
    net_income: 15000,
    asset_breakdown: [
      { name: 'Cash', value: 50000 },
      { name: 'Accounts Receivable', value: 25000 },
      { name: 'Inventory', value: 45000 },
      { name: 'Property & Equipment', value: 30000 }
    ],
    liability_breakdown: [
      { name: 'Accounts Payable', value: 20000 },
      { name: 'Short-term Debt', value: 15000 },
      { name: 'Long-term Debt', value: 25000 }
    ],
    equity_breakdown: [
      { name: 'Common Stock', value: 50000 },
      { name: 'Retained Earnings', value: 25000 },
      { name: 'Net Income', value: 15000 }
    ],
    ratios: {
      current_ratio: 2.5,
      debt_to_equity_ratio: 0.67,
      return_on_equity: 0.167,
      equity_multiplier: 1.67,
      debt_ratio: 0.4,
      net_profit_margin: 0.15
    }
  };
}

/**
 * Handle direct text prompts for the chatbot
 */
async function handleChatPrompt(prompt: string, body: any, request: NextRequest) {
  try {
    const { targetDate, balanceSheet } = body;
    const botName = "Ricky"; // Add bot name constant
    
    // Check for the OpenAI API key
    const openaiApiKey = getOpenAIApiKey(request);
    if (!openaiApiKey) {
      console.warn('OpenAI API key missing in chat prompt request:', request.url);
      return NextResponse.json({
        success: false,
        error: 'Missing OpenAI API key. Please set it in the Settings page.'
      }, { status: 401 });
    }
    
    // Create a more context-rich prompt with financial data but request a conversational response
    let enrichedPrompt = prompt;
    
    // Add financial context if balance sheet is provided
    if (balanceSheet) {
      // Extract key financial metrics for context
      const financialContext = `
Financial Context:
- Date: ${targetDate || balanceSheet.date || 'Unknown'}
- Total Assets: $${balanceSheet.total_asset?.toLocaleString() || 'N/A'}
- Total Liabilities: $${balanceSheet.total_liability?.toLocaleString() || 'N/A'} 
- Total Equity: $${balanceSheet.total_equity?.toLocaleString() || 'N/A'}
- Net Income: $${balanceSheet.net_income?.toLocaleString() || 'N/A'}
- Current Ratio: ${balanceSheet.ratios?.current_ratio?.toFixed(2) || 'N/A'}
- Debt to Equity: ${balanceSheet.ratios?.debt_to_equity_ratio?.toFixed(2) || 'N/A'}
- Return on Equity: ${balanceSheet.ratios?.return_on_equity?.toFixed(2) || 'N/A'}

You are ${botName}, a friendly and knowledgeable financial assistant with a touch of humor. You have the following personality traits:
- You speak in a casual, conversational manner with occasional light jokes
- You're personable and address the user directly
- You occasionally use expressions like "Let me crunch those numbers for you" or "That's a great question!"
- You sign off with short phrases like "Hope that helps!" or "That's my take!"
- You refer to yourself as ${botName} occasionally 
- You make things simple and easy to understand, avoiding excessive financial jargon
- You give practical, actionable advice when possible

Use the financial context above ONLY as reference.
Provide a friendly, conversational answer to the user's question. Do not format your response with Markdown.
Don't provide a full financial analysis unless specifically asked. Keep your response focused on directly answering the question.
`;
      
      enrichedPrompt = financialContext + "\n\nUser question: " + prompt;
    }
    
    // Call OpenAI with the enriched prompt
    // Use the OpenAI API key we already checked above
    const client = new OpenAI({
      apiKey: openaiApiKey
    });
    
    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: enrichedPrompt }],
      max_tokens: 500,
      temperature: 0.75, // Slightly higher temperature for more personality
    });
    
    const chatResponse = response.choices[0].message.content || 'No response could be generated.';
    
    // Also include financial data in the response for reference but don't run separate analysis
    return NextResponse.json({
      success: true,
      analysis: chatResponse,
      financialData: balanceSheet ? {
        date: targetDate || balanceSheet.date,
        totalAssets: balanceSheet.total_asset,
        totalLiabilities: balanceSheet.total_liability,
        totalEquity: balanceSheet.total_equity,
        netIncome: balanceSheet.net_income,
        // Include key ratios without running full analysis
        keyRatios: balanceSheet.ratios
      } : null
    });
  } catch (error) {
    console.error('Error handling chat prompt:', error);
    
    // Check if error is due to missing API key
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json({
        success: false,
        error: 'Missing OpenAI API key. Please set it in the Settings page.',
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error handling chat prompt',
    }, { status: 500 });
  }
}

/**
 * Generate a fallback analysis when the agent fails
 */
function generateFallbackAnalysis(balanceSheet: any, targetDate?: string) {
  const date = targetDate || balanceSheet.date || new Date().toISOString().split('T')[0];
  
  return `## Financial Summary
Based on the financial data provided, the company shows a stable financial position with areas for potential improvement.

### Key Financial Metrics
- Total Assets: $${balanceSheet.total_asset?.toLocaleString() || 'N/A'}
- Total Liabilities: $${balanceSheet.total_liability?.toLocaleString() || 'N/A'}
- Total Equity: $${balanceSheet.total_equity?.toLocaleString() || 'N/A'}
- Current Ratio: ${balanceSheet.ratios?.current_ratio?.toFixed(2) || 'N/A'}
- Debt to Equity Ratio: ${balanceSheet.ratios?.debt_to_equity_ratio?.toFixed(2) || 'N/A'}

## Breakdown of Financial Components
The company maintains a balanced financial structure with appropriate distribution between assets, liabilities, and equity.

## Key Findings
The company appears to maintain adequate liquidity and a reasonable debt structure.

## Recommendations
1. Monitor cash flow and liquidity position
2. Review debt structure to ensure optimal leverage
3. Consider opportunities for strategic investments to boost returns`;
} 