# Creating New Financial Agents

This document provides a guide on how to create new specialized financial analysis agents to extend the current system.

## Agent Structure

The financial agent system follows a simple class inheritance pattern:

1. `BaseAgent` - Abstract base class that provides common functionality
2. Specialized agents (e.g., `SeniorFinancialAnalyst`, `EconomicAnalyst`) - Extend the base agent

## Steps to Create a New Agent

### 1. Define the Agent Interface

First, define the interface for your agent's data input requirements:

```typescript
export interface YourAgentRequest {
  // Define what data your agent needs to function
  financialData: any;
  specificData: any;
  targetDate: string;
  // Other required parameters
}
```

### 2. Create the Agent Class

Create a new file for your agent (e.g., `YourAgent.ts`) and implement your agent class:

```typescript
import { BaseAgent, AgentConfig } from './BaseAgent';

export class YourAgent extends BaseAgent {
  constructor(config?: AgentConfig) {
    super(config);
    // Optionally customize default settings
    this.temperature = config?.temperature || 0.5;
  }

  /**
   * Main analysis method
   */
  public async analyzeData(data: YourAgentRequest): Promise<string> {
    try {
      // Process input data
      const processedData = this.processData(data);
      
      // Construct the prompt
      const prompt = this.constructPrompt(processedData, data.targetDate);
      
      // Generate the analysis
      return await this.generateAnalysis(prompt);
    } catch (error) {
      console.error('Error in analysis:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process input data into a format suitable for the prompt
   */
  private processData(data: YourAgentRequest): string {
    // Transform the data into a format suitable for your prompt
    // This might include formatting, extracting specific fields, etc.
    return JSON.stringify(data, null, 2);
  }

  /**
   * Construct a prompt for your agent
   */
  private constructPrompt(data: string, targetDate: string): string {
    return `
Input Data:
${data}

As a specialized financial analyst focusing on [your specialty], analyze the provided data for ${targetDate} and provide:

1. Key Point 1: Explanation and analysis
2. Key Point 2: Explanation and analysis
3. ...more sections as needed

Ensure your analysis is data-driven and provides actionable insights.
`;
  }
}
```

### 3. Add the Agent to the Factory

Update the `AgentFactory.ts` file to include your new agent:

1. Import your agent class:
```typescript
import { YourAgent, YourAgentRequest } from './YourAgent';
```

2. Update the AgentType type:
```typescript
export type AgentType = 'financial' | 'economic' | 'news' | 'your-agent-type';
```

3. Add your agent to the factory's createAgent method:
```typescript
public createAgent(type: AgentType): BaseAgent {
  switch (type) {
    case 'financial':
      return new SeniorFinancialAnalyst(this.config);
    case 'economic':
      return new EconomicAnalyst(this.config);
    case 'news':
      return new NewsAnalyst(this.config);
    case 'your-agent-type':
      return new YourAgent(this.config);
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}
```

4. Add a method to run your specific agent:
```typescript
public async runYourAgentAnalysis(data: YourAgentRequest): Promise<AgentAnalysisResult> {
  const startTime = Date.now();
  try {
    const agent = this.createAgent('your-agent-type') as YourAgent;
    const analysis = await agent.analyzeData(data);
    
    return {
      success: true,
      analysis,
      metadata: {
        agentType: 'your-agent-type',
        processingTime: Date.now() - startTime,
        dataPoints: this.countCustomDataPoints(data),
      }
    };
  } catch (error) {
    console.error('Error running your agent analysis:', error);
    return {
      success: false,
      analysis: '',
      error: error instanceof Error ? error.message : 'Unknown error in analysis',
      metadata: {
        agentType: 'your-agent-type',
        processingTime: Date.now() - startTime
      }
    };
  }
}
```

5. Define a function to count data points for your agent (optional):
```typescript
private countCustomDataPoints(data: YourAgentRequest): number {
  // Count relevant data points for metrics
  let count = 0;
  // Add logic to count data points
  return count;
}
```

### 4. Update the API Route

Update the `src/app/api/financial/agents/route.ts` file to handle your new agent type:

```typescript
// Add validation for your agent type
if (!['financial', 'economic', 'news', 'your-agent-type', 'comprehensive'].includes(agentType)) {
  return NextResponse.json({
    success: false,
    error: `Invalid agent type: ${agentType}`
  }, { status: 400 });
}

// Add handler for your agent type
if (agentType === 'your-agent-type') {
  const yourAgentData = {
    financialData: { balanceSheet: processBalanceSheet(balanceSheet) },
    specificData: body.specificData,
    targetDate: targetDate || balanceSheet.date
  };
  
  const result = await agentFactory.runYourAgentAnalysis(yourAgentData);
  return NextResponse.json(result);
}
```

### 5. Export Your Agent

Update the `index.ts` file to export your new agent:

```typescript
export * from './YourAgent';
```

## Prompt Engineering Tips

For effective financial analysis agents, consider these prompt engineering tips:

1. **Structure the output**: Specify clear sections for the analysis
2. **Define the role**: Clearly state what kind of analyst the AI should be
3. **Provide context**: Include relevant financial data and time period
4. **Set expectations**: Define what a good analysis includes
5. **Request actionable insights**: Ensure the analysis provides practical recommendations
6. **Specify audience**: Tailor the language to the intended audience (technical vs. non-technical)

## Example Specialized Agents

Consider creating these specialized financial agents:

- **Investment Analyst**: Evaluates investment opportunities and portfolio performance
- **Risk Management Analyst**: Identifies and quantifies financial risks
- **Tax Strategy Analyst**: Provides tax planning and optimization strategies
- **Fraud Detection Analyst**: Identifies potential financial irregularities
- **ESG Analyst**: Evaluates environmental, social, and governance factors
- **Merger & Acquisition Analyst**: Analyzes potential M&A opportunities
- **Competitor Analysis Agent**: Compares financial performance against competitors 