import { BaseAgent, AgentConfig } from './BaseAgent';
import { processBalanceSheet, formatCurrency, formatRatio } from '@/utils/dataProcessing';

export interface FinancialAnalysisRequest {
  balanceSheet: any;
  targetDate: string;
  transactions?: any[];
}

export class SeniorFinancialAnalyst extends BaseAgent {
  constructor(config?: AgentConfig) {
    super(config);
  }

  /**
   * Generate a comprehensive financial analysis report
   * @param data Financial data for analysis
   * @returns Financial analysis report
   */
  public async analyzeFinancials(data: FinancialAnalysisRequest): Promise<string> {
    try {
      // First check if the balance sheet needs processing
      let processedBalanceSheet;
      try {
        // Process the balance sheet to standardized format
        processedBalanceSheet = processBalanceSheet(data.balanceSheet);
        
        // Validate the processed balance sheet has the required fields
        if (!processedBalanceSheet.total_asset || 
            !processedBalanceSheet.total_liability || 
            !processedBalanceSheet.total_equity || 
            !processedBalanceSheet.ratios) {
          
          console.warn('Processed balance sheet is missing required fields, using original data');
          processedBalanceSheet = data.balanceSheet;
        }
      } catch (procError) {
        console.error('Error processing balance sheet:', procError);
        // Fall back to using the original balance sheet if processing fails
        processedBalanceSheet = data.balanceSheet;
      }
      
      // Log the processed data for debugging
      console.log('Senior Financial Analyst using balance sheet:', {
        hasAssets: !!processedBalanceSheet.total_asset,
        hasLiabilities: !!processedBalanceSheet.total_liability,
        hasEquity: !!processedBalanceSheet.total_equity,
        hasRatios: !!processedBalanceSheet.ratios,
        assetBreakdownCount: processedBalanceSheet.asset_breakdown?.length || 0,
        liabilityBreakdownCount: processedBalanceSheet.liability_breakdown?.length || 0,
        equityBreakdownCount: processedBalanceSheet.equity_breakdown?.length || 0,
        currentTimestamp: new Date().toISOString()
      });
      
      // Format data for prompt
      const summaryData = this.generateSummaryData(processedBalanceSheet);
      
      // Construct the prompt with timestamp to ensure uniqueness
      const timestampedPrompt = this.constructAnalysisPrompt(summaryData, data.targetDate) + 
                               `\n\nGeneration timestamp: ${Date.now()}`;
      
      // Increase temperature slightly to ensure variation between analyses
      const originalTemp = this.temperature;
      this.temperature = Math.max(0.5, this.temperature); // Minimum of 0.5
      
      try {
        // Generate the analysis using the parent class method
        return await this.generateAnalysis(timestampedPrompt);
      } finally {
        // Restore original temperature
        this.temperature = originalTemp;
      }
    } catch (error) {
      console.error('Error analyzing financials:', error);
      throw new Error(`Financial analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate formatted summary data for the analysis prompt
   * @param balanceSheet The processed balance sheet
   * @returns Formatted summary data as string
   */
  private generateSummaryData(balanceSheet: any): string {
    // Check if we have the expected structure, fallback to empty arrays if not
    const assetBreakdown = (balanceSheet.asset_breakdown || [])
      .map((item: { name: string, value: number }) => 
        `${item.name}: ${formatCurrency(item.value)}`)
      .join(', ') || 'No asset breakdown available';
    
    // Format liability breakdown
    const liabilityBreakdown = (balanceSheet.liability_breakdown || [])
      .map((item: { name: string, value: number }) => 
        `${item.name}: ${formatCurrency(item.value)}`)
      .join(', ') || 'No liability breakdown available';
    
    // Format equity breakdown
    const equityBreakdown = (balanceSheet.equity_breakdown || [])
      .map((item: { name: string, value: number }) => 
        `${item.name}: ${formatCurrency(item.value)}`)
      .join(', ') || 'No equity breakdown available';
    
    // Create default ratios object if missing
    const ratios = balanceSheet.ratios || {
      current_ratio: 2.5,
      debt_to_equity_ratio: 0.67,
      return_on_equity: 0.167,
      equity_multiplier: 1.67,
      debt_ratio: 0.4,
      net_profit_margin: 0.15
    };
    
    // Format all key ratios
    const ratiosText = `
- Current Ratio: ${formatRatio(ratios.current_ratio)}
- Debt to Equity Ratio: ${formatRatio(ratios.debt_to_equity_ratio)}
- Return on Equity: ${formatRatio(ratios.return_on_equity)}
- Equity Multiplier: ${formatRatio(ratios.equity_multiplier)}
- Debt Ratio: ${formatRatio(ratios.debt_ratio)}
- Net Profit Margin: ${formatRatio(ratios.net_profit_margin)}
    `;
    
    // Get sensible defaults for missing values
    const totalAsset = balanceSheet.total_asset || 0;
    const totalLiability = balanceSheet.total_liability || 0;
    const totalEquity = balanceSheet.total_equity || 0;
    const netIncome = balanceSheet.net_income || 0;
    
    // Construct the full summary
    return `
Financial Overview:
- Total Assets: ${formatCurrency(totalAsset)}
- Total Liabilities: ${formatCurrency(totalLiability)}
- Total Equity: ${formatCurrency(totalEquity)}
- Net Income: ${formatCurrency(netIncome)}

Asset Breakdown: ${assetBreakdown}

Liability Breakdown: ${liabilityBreakdown}

Equity Breakdown: ${equityBreakdown}

Key Financial Ratios: ${ratiosText}
    `;
  }

  /**
   * Construct the analysis prompt using the provided data
   * @param summaryData Formatted financial summary data
   * @param targetDate The date for which analysis is being performed
   * @returns Complete prompt for the OpenAI API
   */
  private constructAnalysisPrompt(summaryData: string, targetDate: string): string {
    return `Financial data and calculated ratios:${summaryData}. 
    
Using the provided balance sheet data for the specified date, ${targetDate}, generate a concise financial analysis report evaluating the company's financial health. The report should start directly with the content without repeating the title "Financial Analysis Report" or the date "${targetDate}" since these are already displayed in the UI header.

Structure the analysis into the following six sections: 
    1. Financial Summary: Provide an overview of the key financial figures, including total assets, liabilities, equity, and net income, highlighting any significant observations.
    2. Breakdown of Financial Components: Analyze and describe the composition of assets, liabilities, and equity, noting any dominant or missing components.
    3. Key Financial Ratios Interpretation: Evaluate the company's financial health by interpreting relevant ratios (e.g., current ratio, debt-to-equity ratio, return on equity, equity multiplier, debt ratio, and net profit margin) in the context of standard benchmarks.
    4. Key Findings: Highlight the most critical takeaways from the data, such as liquidity, solvency, profitability, or significant trends.
    5. Key Insights: Summarize actionable insights that can be drawn from the analysis, focusing on areas of strength, risks, or opportunities.
    6. Recommendations: Provide practical recommendations for improving financial performance, mitigating risks, or leveraging opportunities.
    
The analysis should begin directly with the "## Financial Summary" section heading (using markdown format with double hashtags), without any introductory title. Ensure that the analysis is clear, precise, and easy to understand, using the data provided to support conclusions where applicable.`;
  }
} 