# Financial Analysis Agents

A collection of AI-powered agents for comprehensive financial analysis, including:

1. **Senior Financial Analyst** - Provides detailed analysis of financial statements and ratios
2. **Economic Analyst** - Analyzes economic context and its impact on financial performance
3. **News Analyst** - Evaluates news coverage and its implications for financial outlook

## Agent Capabilities

### Senior Financial Analyst

The Senior Financial Analyst agent examines balance sheet data and calculates key financial ratios to produce a structured analysis report with:

- Financial summary overview
- Breakdown of financial components 
- Key financial ratios interpretation
- Critical findings
- Actionable insights
- Strategic recommendations

### Economic Analyst

The Economic Analyst agent analyzes economic indicators and their potential impact on a company's financial position:

- Economic environment assessment
- Industry impact analysis
- Financial vulnerability identification
- Economic opportunities and threats
- Strategic recommendations
- Economic outlook prediction

### News Analyst

The News Analyst agent processes news articles related to a company or industry to provide:

- News sentiment overview
- Key news themes identification
- Industry context analysis
- Financial impact assessment
- Risk identification
- Opportunity analysis
- Strategic implications
- Recommended actions

## How to Use

### API Endpoint

The agents can be accessed through the `/api/financial/agents` endpoint:

```typescript
// Example API call
const response = await fetch('/api/financial/agents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    agentType: 'financial', // 'financial', 'economic', 'news', or 'comprehensive'
    balanceSheet: balanceSheetData,
    targetDate: '2023-04-01',
    // Additional parameters as needed
  }),
});

const result = await response.json();
```

### Request Parameters

| Parameter | Type | Description | Required For |
|-----------|------|-------------|-------------|
| `agentType` | string | Agent type: 'financial', 'economic', 'news', or 'comprehensive' | All |
| `balanceSheet` | object | Balance sheet data for analysis | All |
| `targetDate` | string | Date of analysis (YYYY-MM-DD) | All |
| `balanceSheetId` | number | ID of specific balance sheet to analyze | Optional |
| `companyName` | string | Name of the company | News, Economic |
| `industry` | string | Industry of the company | News, Economic |
| `economicContext` | object | Economic context data | Economic |
| `newsArticles` | array | News articles for analysis | News |
| `timeframe` | string | Timeframe for news analysis | News |

### Economic Context Format

```json
{
  "period": "Current Quarter",
  "region": "United States",
  "gdpGrowth": 0.032,
  "inflation": 0.042,
  "unemployment": 0.038,
  "interestRates": {
    "federal": 0.05,
    "prime": 0.075
  },
  "industryTrends": [
    "Increased digital transformation",
    "Supply chain challenges",
    "Rising labor costs"
  ],
  "marketIndices": {
    "S&P 500": 4580,
    "NASDAQ": 14500,
    "DOW": 36000
  }
}
```

### News Articles Format

```json
[
  {
    "title": "Company Inc. Reports Strong Quarterly Earnings",
    "source": "Financial Times",
    "date": "2023-04-01",
    "content": "Company Inc. has reported better than expected quarterly earnings...",
    "sentiment": { 
      "score": 0.8,
      "label": "positive"
    },
    "topics": ["earnings", "growth", "revenue"]
  }
]
```

## Comprehensive Analysis

For a complete analysis, use the 'comprehensive' agent type to run all three agents in parallel and get combined results:

```typescript
const response = await fetch('/api/financial/agents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    agentType: 'comprehensive',
    balanceSheet: balanceSheetData,
    targetDate: '2023-04-01',
    companyName: 'Demo Company Inc.',
    industry: 'Technology',
    economicContext: economicContextData,
    newsArticles: newsArticlesData
  }),
});

const result = await response.json();
// Access individual agent results via:
// result.results.financial
// result.results.economic
// result.results.news
```

## Using the Agent Factory Directly

For more advanced usage, you can import and use the `AgentFactory` class directly:

```typescript
import { AgentFactory } from '@/app/agents';

// Create an agent factory with custom configuration
const agentFactory = new AgentFactory({
  model: 'gpt-4-turbo',
  temperature: 0.5,
  maxTokens: 2000
});

// Run a specific analysis
const financialResult = await agentFactory.runFinancialAnalysis({
  balanceSheet: balanceSheetData,
  targetDate: '2023-04-01'
});

console.log(financialResult.analysis);
```

## Example UI Implementation

See the `/financial-agents` page for an example UI implementation of the financial analysis agents.

## Testing

A simple HTML test page is available at `/financial-agents-test.html` that allows testing the API directly in the browser. 