# Financial Analysis Platform with AI Agents

A comprehensive financial analysis platform powered by Next.js and AI agents for in-depth financial insights.

## Features

- **Financial Dashboard**: Interactive visualizations of financial data
- **Balance Sheet Analysis**: Detailed breakdown of financial statements
- **AI-Powered Analysis**: Multiple specialized AI agents providing financial insights:
  - **Senior Financial Analyst**: Analyzes financial statements and key ratios
  - **Economic Analyst**: Evaluates economic context and impact on financials
  - **News Analyst**: Processes news coverage and implications for financial outlook

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Financial Analysis Agents

The platform includes specialized AI agents for comprehensive financial analysis:

### Available Agents

- **Senior Financial Analyst**: Analyzes balance sheets, financial ratios, and provides recommendations
- **Economic Analyst**: Evaluates economic indicators and their impact on financial performance
- **News Analyst**: Analyzes news coverage and its financial implications

### Using the Agents

Agents can be accessed through:

1. **UI Interface**: Visit `/financial-agents` to use the agents through a user-friendly interface
2. **API Endpoint**: Make POST requests to `/api/financial/agents` with the appropriate parameters
3. **Direct Sandbox**: Try the standalone HTML test page at `/financial-agents-test.html`

For detailed documentation on using the agents, see [Financial Agents Documentation](./src/app/agents/README.md).

### Extending Agents

To create new specialized agents, follow the guide in [Creating New Agents](./src/app/agents/CreatingAgents.md).

## Environment Setup

To run this project, you'll need to set up your environment variables:

1. Create a `.env` file in the root directory
2. Add the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
