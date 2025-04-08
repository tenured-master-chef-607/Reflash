import { BaseAgent, AgentConfig } from './BaseAgent';
import { SeniorFinancialAnalyst, FinancialAnalysisRequest } from './SeniorFinancialAnalyst';
import { EconomicAnalyst, EconomicAnalysisRequest, EconomicContext } from './EconomicAnalyst';
import { NewsAnalyst, NewsAnalysisRequest, NewsArticle } from './NewsAnalyst';

export type AgentType = 'financial' | 'economic' | 'news';

export interface AgentAnalysisResult {
  success: boolean;
  analysis: string;
  error?: string;
  metadata?: {
    agentType: AgentType;
    processingTime: number;
    dataPoints?: number;
  };
}

export class AgentFactory {
  private config: AgentConfig;

  constructor(apiKey?: string) {
    this.config = {
      model: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 1500,
      apiKey
    };
  }

  /**
   * Create an agent of the specified type
   * @param type The type of agent to create
   * @returns A specialized agent instance
   */
  public createAgent(type: AgentType): BaseAgent {
    switch (type) {
      case 'financial':
        return new SeniorFinancialAnalyst(this.config);
      case 'economic':
        return new EconomicAnalyst(this.config);
      case 'news':
        return new NewsAnalyst(this.config);
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }

  /**
   * Run financial analysis using the SeniorFinancialAnalyst agent
   * @param data Financial data for analysis
   * @returns Analysis result
   */
  public async runFinancialAnalysis(data: FinancialAnalysisRequest): Promise<AgentAnalysisResult> {
    const startTime = Date.now();
    try {
      const agent = this.createAgent('financial') as SeniorFinancialAnalyst;
      const analysis = await agent.analyzeFinancials(data);
      
      return {
        success: true,
        analysis,
        metadata: {
          agentType: 'financial',
          processingTime: Date.now() - startTime,
          dataPoints: this.countDataPoints(data),
        }
      };
    } catch (error) {
      console.error('Error running financial analysis:', error);
      return {
        success: false,
        analysis: '',
        error: error instanceof Error ? error.message : 'Unknown error in financial analysis',
        metadata: {
          agentType: 'financial',
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Run economic analysis using the EconomicAnalyst agent
   * @param data Economic data for analysis
   * @returns Analysis result
   */
  public async runEconomicAnalysis(data: EconomicAnalysisRequest): Promise<AgentAnalysisResult> {
    const startTime = Date.now();
    try {
      const agent = this.createAgent('economic') as EconomicAnalyst;
      const analysis = await agent.analyzeEconomicContext(data);
      
      return {
        success: true,
        analysis,
        metadata: {
          agentType: 'economic',
          processingTime: Date.now() - startTime,
          dataPoints: this.countEconomicDataPoints(data.economicContext),
        }
      };
    } catch (error) {
      console.error('Error running economic analysis:', error);
      return {
        success: false,
        analysis: '',
        error: error instanceof Error ? error.message : 'Unknown error in economic analysis',
        metadata: {
          agentType: 'economic',
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Run news analysis using the NewsAnalyst agent
   * @param data News data for analysis
   * @returns Analysis result
   */
  public async runNewsAnalysis(data: NewsAnalysisRequest): Promise<AgentAnalysisResult> {
    const startTime = Date.now();
    try {
      const agent = this.createAgent('news') as NewsAnalyst;
      const analysis = await agent.analyzeNews(data);
      
      return {
        success: true,
        analysis,
        metadata: {
          agentType: 'news',
          processingTime: Date.now() - startTime,
          dataPoints: data.newsArticles.length,
        }
      };
    } catch (error) {
      console.error('Error running news analysis:', error);
      return {
        success: false,
        analysis: '',
        error: error instanceof Error ? error.message : 'Unknown error in news analysis',
        metadata: {
          agentType: 'news',
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Run a comprehensive analysis using all agents
   * @param financialData Financial data
   * @param economicData Economic data
   * @param newsData News data
   * @returns Combined analysis results from all agents
   */
  public async runComprehensiveAnalysis(
    financialData: FinancialAnalysisRequest,
    economicData: EconomicAnalysisRequest,
    newsData: NewsAnalysisRequest
  ): Promise<{ [key in AgentType]: AgentAnalysisResult }> {
    // Run all analyses in parallel for efficiency
    const [financialResult, economicResult, newsResult] = await Promise.all([
      this.runFinancialAnalysis(financialData),
      this.runEconomicAnalysis(economicData),
      this.runNewsAnalysis(newsData)
    ]);
    
    return {
      financial: financialResult,
      economic: economicResult,
      news: newsResult
    };
  }

  /**
   * Count data points in financial data for metadata
   * @param data Financial data
   * @returns Number of data points
   */
  private countDataPoints(data: any): number {
    let count = 0;
    
    if (data.balanceSheet) {
      count += 1; // Count the balance sheet itself
      
      // Count breakdown items
      if (data.balanceSheet.asset_breakdown) {
        count += data.balanceSheet.asset_breakdown.length || 0;
      }
      
      if (data.balanceSheet.liability_breakdown) {
        count += data.balanceSheet.liability_breakdown.length || 0;
      }
      
      if (data.balanceSheet.equity_breakdown) {
        count += data.balanceSheet.equity_breakdown.length || 0;
      }
      
      // Count ratios
      if (data.balanceSheet.ratios) {
        count += Object.keys(data.balanceSheet.ratios).length || 0;
      }
    }
    
    if (data.transactions) {
      count += data.transactions.length || 0;
    }
    
    return count;
  }

  /**
   * Count data points in economic context for metadata
   * @param context Economic context
   * @returns Number of data points
   */
  private countEconomicDataPoints(context: EconomicContext): number {
    let count = 0;
    
    // Count basic metrics
    if (context.gdpGrowth !== undefined) count += 1;
    if (context.inflation !== undefined) count += 1;
    if (context.unemployment !== undefined) count += 1;
    
    // Count interest rates
    if (context.interestRates) {
      if (context.interestRates.federal !== undefined) count += 1;
      if (context.interestRates.prime !== undefined) count += 1;
    }
    
    // Count industry trends
    if (context.industryTrends) {
      count += context.industryTrends.length;
    }
    
    // Count market indices
    if (context.marketIndices) {
      count += Object.keys(context.marketIndices).length;
    }
    
    return count;
  }
} 