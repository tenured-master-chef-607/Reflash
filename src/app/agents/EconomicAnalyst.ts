import { BaseAgent, AgentConfig } from './BaseAgent';

export interface EconomicContext {
  gdpGrowth?: number;
  inflation?: number;
  unemployment?: number;
  interestRates?: {
    federal?: number;
    prime?: number;
  };
  industryTrends?: string[];
  marketIndices?: {
    [key: string]: number;
  };
  period?: string;
  region?: string;
}

export interface EconomicAnalysisRequest {
  financialData: any;
  economicContext: EconomicContext;
  targetDate: string;
}

export class EconomicAnalyst extends BaseAgent {
  constructor(config?: AgentConfig) {
    super(config);
  }

  /**
   * Analyze economic conditions and their impact on the financials
   * @param data Request containing financial and economic data
   * @returns Economic analysis report
   */
  public async analyzeEconomicContext(data: EconomicAnalysisRequest): Promise<string> {
    try {
      // Format the economic context data
      const economicContextSummary = this.formatEconomicContext(data.economicContext);
      
      // Extract relevant financial metrics
      const financialMetrics = this.extractFinancialMetrics(data.financialData);
      
      // Construct the prompt
      const prompt = this.constructEconomicAnalysisPrompt(
        economicContextSummary, 
        financialMetrics, 
        data.targetDate
      );
      
      // Generate the analysis
      return await this.generateAnalysis(prompt);
    } catch (error) {
      console.error('Error analyzing economic context:', error);
      throw new Error(`Economic analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format economic context data into a readable summary
   * @param context Economic context data
   * @returns Formatted economic context summary
   */
  private formatEconomicContext(context: EconomicContext): string {
    const parts = [];
    
    parts.push(`Economic Period: ${context.period || 'Not specified'}`);
    parts.push(`Region: ${context.region || 'Global'}`);
    
    if (context.gdpGrowth !== undefined) {
      parts.push(`GDP Growth: ${(context.gdpGrowth * 100).toFixed(2)}%`);
    }
    
    if (context.inflation !== undefined) {
      parts.push(`Inflation Rate: ${(context.inflation * 100).toFixed(2)}%`);
    }
    
    if (context.unemployment !== undefined) {
      parts.push(`Unemployment Rate: ${(context.unemployment * 100).toFixed(2)}%`);
    }
    
    if (context.interestRates) {
      const rates = [];
      if (context.interestRates.federal !== undefined) {
        rates.push(`Federal Rate: ${(context.interestRates.federal * 100).toFixed(2)}%`);
      }
      if (context.interestRates.prime !== undefined) {
        rates.push(`Prime Rate: ${(context.interestRates.prime * 100).toFixed(2)}%`);
      }
      if (rates.length > 0) {
        parts.push(`Interest Rates: ${rates.join(', ')}`);
      }
    }
    
    if (context.industryTrends && context.industryTrends.length > 0) {
      parts.push(`Industry Trends: ${context.industryTrends.join('; ')}`);
    }
    
    if (context.marketIndices && Object.keys(context.marketIndices).length > 0) {
      const indices = Object.entries(context.marketIndices)
        .map(([name, value]) => `${name}: ${value}`)
        .join(', ');
      parts.push(`Market Indices: ${indices}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Extract relevant financial metrics for economic analysis
   * @param financialData The financial data to extract metrics from
   * @returns Summary of financial metrics
   */
  private extractFinancialMetrics(financialData: any): string {
    try {
      // Extract relevant financial information for economic analysis
      const metrics = [];
      
      if (financialData.balanceSheet) {
        const sheet = financialData.balanceSheet;
        metrics.push(`Total Assets: $${(sheet.total_asset || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
        metrics.push(`Total Liabilities: $${(sheet.total_liability || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
        metrics.push(`Total Equity: $${(sheet.total_equity || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
        metrics.push(`Net Income: $${(sheet.net_income || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
        
        if (sheet.ratios) {
          metrics.push(`Debt Ratio: ${(sheet.ratios.debt_ratio || 0).toFixed(2)}`);
          metrics.push(`Current Ratio: ${(sheet.ratios.current_ratio || 0).toFixed(2)}`);
        }
      }
      
      return metrics.join('\n');
    } catch (error) {
      console.error('Error extracting financial metrics:', error);
      return 'Error extracting financial metrics';
    }
  }

  /**
   * Construct the economic analysis prompt
   * @param economicContextSummary Summary of economic context
   * @param financialMetrics Summary of financial metrics
   * @param targetDate The target date for analysis
   * @returns Complete prompt for economic analysis
   */
  private constructEconomicAnalysisPrompt(
    economicContextSummary: string,
    financialMetrics: string,
    targetDate: string
  ): string {
    return `
Economic Context Data:
${economicContextSummary}

Company Financial Metrics as of ${targetDate}:
${financialMetrics}

As an economic analyst, provide a comprehensive analysis of how the current economic conditions are affecting or may affect the company's financial position. Your analysis should include:

1. Economic Environment Assessment: Evaluate the current economic environment based on GDP growth, inflation, unemployment, and interest rates.

2. Industry Impact: Analyze how current economic trends are impacting the company's industry and market.

3. Financial Vulnerability: Identify how the company's financial structure makes it vulnerable or resilient to current economic conditions.

4. Economic Opportunities: Highlight potential opportunities in the current economic landscape that the company could leverage.

5. Economic Threats: Outline potential threats posed by current economic conditions that the company should prepare for.

6. Recommendations: Provide strategic recommendations for navigating the current economic environment to mitigate risks and capitalize on opportunities.

7. Economic Outlook: Predict how potential changes in economic factors might impact the company in the short to medium term.

Ensure that your analysis is data-driven, connecting economic indicators to specific financial metrics where possible, and focused on actionable insights.
`;
  }
} 