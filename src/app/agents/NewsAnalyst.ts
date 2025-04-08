import { BaseAgent, AgentConfig } from './BaseAgent';

export interface NewsArticle {
  title: string;
  source: string;
  date: string;
  content: string;
  url?: string;
  sentiment?: {
    score: number; // -1 to 1 (negative to positive)
    label?: 'negative' | 'neutral' | 'positive';
  };
  topics?: string[];
}

export interface NewsAnalysisRequest {
  companyName: string;
  industry: string;
  financialData: any;
  newsArticles: NewsArticle[];
  targetDate: string;
  timeframe?: string; // e.g., "past week", "past month", "past quarter"
}

export class NewsAnalyst extends BaseAgent {
  constructor(config?: AgentConfig) {
    super(config);
    // Lower temperature for more factual analysis
    this.temperature = config?.temperature || 0.4;
  }

  /**
   * Analyze news articles for financial insights
   * @param data Request containing financial data and news articles
   * @returns News analysis report with financial implications
   */
  public async analyzeNews(data: NewsAnalysisRequest): Promise<string> {
    try {
      // Process and summarize news articles
      const newsSummary = this.summarizeNewsArticles(data.newsArticles);
      
      // Extract relevant financial metrics for context
      const financialContext = this.extractFinancialContext(data.financialData);
      
      // Construct the prompt
      const prompt = this.constructNewsAnalysisPrompt(
        data.companyName,
        data.industry,
        newsSummary,
        financialContext,
        data.targetDate,
        data.timeframe || 'recent'
      );
      
      // Generate the analysis
      return await this.generateAnalysis(prompt);
    } catch (error) {
      console.error('Error analyzing news:', error);
      throw new Error(`News analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Summarize news articles into a concise format
   * @param articles Array of news articles
   * @returns Summarized news content
   */
  private summarizeNewsArticles(articles: NewsArticle[]): string {
    // Sort articles by date (newest first)
    const sortedArticles = [...articles].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Create summarized version of each article
    const articleSummaries = sortedArticles.map((article, index) => {
      // Calculate a basic sentiment label if not provided
      const sentimentLabel = article.sentiment?.label || 
        (article.sentiment?.score !== undefined 
          ? (article.sentiment.score < -0.2 ? 'negative' : article.sentiment.score > 0.2 ? 'positive' : 'neutral')
          : 'unknown');
      
      return `Article ${index + 1}:
Title: ${article.title}
Source: ${article.source}
Date: ${article.date}
Sentiment: ${sentimentLabel} ${article.sentiment?.score !== undefined ? `(${article.sentiment.score.toFixed(2)})` : ''}
${article.topics && article.topics.length > 0 ? `Topics: ${article.topics.join(', ')}\n` : ''}
Content Summary: ${article.content.length > 300 ? article.content.substring(0, 300) + '...' : article.content}`;
    });
    
    return articleSummaries.join('\n\n');
  }

  /**
   * Extract relevant financial context from financial data
   * @param financialData Financial data to extract context from
   * @returns Summary of financial context
   */
  private extractFinancialContext(financialData: any): string {
    try {
      // Extract basic financial metrics for news analysis context
      const metrics = [];
      
      if (financialData.balanceSheet) {
        const sheet = financialData.balanceSheet;
        metrics.push(`Total Assets: $${(sheet.total_asset || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
        metrics.push(`Total Liabilities: $${(sheet.total_liability || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
        metrics.push(`Net Income: $${(sheet.net_income || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
      }
      
      return metrics.join('\n');
    } catch (error) {
      console.error('Error extracting financial context for news analysis:', error);
      return 'Error extracting financial context';
    }
  }

  /**
   * Construct the news analysis prompt
   * @param companyName The name of the company
   * @param industry The industry of the company
   * @param newsSummary Summary of news articles
   * @param financialContext Financial context summary
   * @param targetDate Target date for analysis
   * @param timeframe Timeframe for news analysis
   * @returns Complete prompt for news analysis
   */
  private constructNewsAnalysisPrompt(
    companyName: string,
    industry: string,
    newsSummary: string,
    financialContext: string,
    targetDate: string,
    timeframe: string
  ): string {
    return `
Company: ${companyName}
Industry: ${industry}
Date of Analysis: ${targetDate}
Timeframe: ${timeframe}

Financial Context:
${financialContext}

News Articles:
${newsSummary}

As a financial news analyst, analyze the provided news articles and their potential impact on the company's financial position and market perception. Your analysis should include:

1. News Sentiment Overview: Evaluate the overall sentiment of news coverage during this period and identify any significant shifts.

2. Key News Themes: Identify and analyze the main themes or topics emerging from the news articles.

3. Industry News Context: Place the company-specific news within the broader industry context, noting any sector-wide trends or issues.

4. Financial Impact Assessment: Assess the potential impact of the news on the company's financial metrics, stock performance, and investor confidence.

5. Risk Identification: Identify any potential risks or threats revealed by the news coverage that could affect the company's financial health.

6. Opportunity Analysis: Highlight any potential opportunities mentioned in the news that the company could leverage for financial growth.

7. Strategic Implications: Discuss the strategic implications of the news for the company's short and long-term financial planning.

8. Recommendations: Provide actionable recommendations for how the company should respond to the news coverage from a financial perspective.

Ensure your analysis is balanced, fact-based, and focuses on the financial implications rather than speculative market reactions.
`;
  }
} 