import { openai } from '@/utils/openai';
import OpenAI from 'openai';

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export class BaseAgent {
  protected model: string;
  protected temperature: number;
  protected maxTokens: number;
  protected apiKey?: string;

  constructor(config?: AgentConfig) {
    this.model = config?.model || 'gpt-4-turbo';
    this.temperature = config?.temperature || 0.7;
    this.maxTokens = config?.maxTokens || 1500;
    this.apiKey = config?.apiKey;
  }

  /**
   * Generate analysis using OpenAI
   * @param prompt The prompt to send to the OpenAI API
   * @returns Analysis text from the OpenAI API
   */
  protected async generateAnalysis(prompt: string): Promise<string> {
    try {
      const client = this.apiKey 
        ? new OpenAI({ apiKey: this.apiKey })
        : openai;
        
      const response = await client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });
      
      return response.choices[0].message.content || 'No analysis could be generated.';
    } catch (error) {
      console.error('Error generating analysis:', error);
      throw new Error(`Failed to generate analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format financial data into a readable summary text
   * @param data Financial data to format
   * @returns Formatted string representing the financial data
   */
  protected formatFinancialData(data: any): string {
    return JSON.stringify(data, null, 2);
  }
} 