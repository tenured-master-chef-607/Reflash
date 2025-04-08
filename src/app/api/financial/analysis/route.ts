import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/utils/openai';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { balanceSheet, transactions } = body;
    
    if (!balanceSheet) {
      return NextResponse.json({
        success: false,
        error: 'Missing balance sheet data for analysis'
      }, { status: 400 });
    }
    
    // Convert the data to a format suitable for OpenAI
    const financialData = {
      date: balanceSheet.date,
      totalAssets: balanceSheet.total_asset,
      totalLiabilities: balanceSheet.total_liability,
      totalEquity: balanceSheet.total_equity,
      netIncome: balanceSheet.net_income,
      assetBreakdown: balanceSheet.asset_breakdown,
      liabilityBreakdown: balanceSheet.liability_breakdown,
      equityBreakdown: balanceSheet.equity_breakdown,
      ratios: balanceSheet.ratios,
      relatedTransactions: transactions || []
    };
    
    // Construct the prompt
    const prompt = `
As a financial analyst, provide a comprehensive analysis of the following financial data:

Financial Date: ${new Date(financialData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Balance Sheet Summary:
- Total Assets: $${financialData.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total Liabilities: $${financialData.totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total Equity: $${financialData.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Net Income: $${financialData.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Key Financial Ratios:
- Current Ratio: ${financialData.ratios.current_ratio.toFixed(2)}
- Debt to Equity Ratio: ${financialData.ratios.debt_to_equity_ratio.toFixed(2)}
- Return on Equity: ${financialData.ratios.return_on_equity.toFixed(2)}
- Equity Multiplier: ${financialData.ratios.equity_multiplier.toFixed(2)}
- Debt Ratio: ${financialData.ratios.debt_ratio.toFixed(2)}
- Net Profit Margin: ${financialData.ratios.net_profit_margin.toFixed(2)}

Provide:
1. A detailed assessment of the company's financial health
2. Strengths and weaknesses in the financial structure
3. Recommendations for improvement
4. Future outlook based on current financial indicators
5. Key risks to be aware of

Your analysis should be comprehensive yet concise, and written in a professional financial reporting style.
`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    const analysis = response.choices[0].message.content || 'No analysis could be generated.';
    
    return NextResponse.json({
      success: true,
      analysis,
    });
    
  } catch (error) {
    console.error('Error generating financial analysis:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating financial analysis',
      analysis: 'Unable to generate analysis due to an error. Please try again later.'
    }, { status: 500 });
  }
} 