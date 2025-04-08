'use client';

import { useState } from 'react';
import { fetchFinancialData } from '@/utils/fetchFinancialData';
import { processBalanceSheet } from '@/utils/dataProcessing';

export default function FinancialAgentsPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);
  const [agentType, setAgentType] = useState<string>('financial');
  const [error, setError] = useState<string | null>(null);
  
  const runAnalysis = async (type: string) => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      // Fetch financial data
      const financialData = await fetchFinancialData();
      
      // Take the most recent balance sheet
      const mostRecentBalanceSheet = financialData.balanceSheets[0];
      const targetDate = mostRecentBalanceSheet.date;
      
      // Set up demo economic context
      const economicContext = {
        period: 'Current Quarter',
        region: 'United States',
        gdpGrowth: 0.032,
        inflation: 0.042,
        unemployment: 0.038,
        interestRates: {
          federal: 0.05,
          prime: 0.075
        },
        industryTrends: [
          'Increased digital transformation',
          'Supply chain challenges',
          'Rising labor costs'
        ],
        marketIndices: {
          'S&P 500': 4580,
          'NASDAQ': 14500,
          'DOW': 36000
        }
      };
      
      // Set up demo news articles
      const newsArticles = [
        {
          title: 'Company Inc. Reports Strong Quarterly Earnings',
          source: 'Financial Times',
          date: new Date().toISOString().split('T')[0],
          content: 'Company Inc. has reported better than expected quarterly earnings, with revenue up 15% year-over-year. The company cited strong product demand and successful cost-cutting measures as key drivers of growth.',
          sentiment: { score: 0.8, label: 'positive' }
        },
        {
          title: 'Industry Faces Regulatory Challenges',
          source: 'Wall Street Journal',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          content: 'The technology industry is facing increased regulatory scrutiny, with new legislation being proposed that could impact profitability and operations. Analysts suggest companies may need to adjust their business models.',
          sentiment: { score: -0.5, label: 'negative' }
        },
        {
          title: 'Market Outlook Remains Uncertain Amid Economic Indicators',
          source: 'Bloomberg',
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          content: 'Mixed economic signals continue to create uncertainty in financial markets. While unemployment remains low, inflation concerns and supply chain issues persist, creating a complex environment for businesses.',
          sentiment: { score: -0.1, label: 'neutral' }
        }
      ];
      
      // Build the request body based on the analysis type
      const requestBody: any = {
        agentType: type,
        balanceSheet: mostRecentBalanceSheet,
        targetDate,
        companyName: 'Demo Company Inc.',
        industry: 'Technology',
      };
      
      // Add additional data based on the agent type
      if (type === 'economic' || type === 'comprehensive') {
        requestBody.economicContext = economicContext;
      }
      
      if (type === 'news' || type === 'comprehensive') {
        requestBody.newsArticles = newsArticles;
      }
      
      // Call the API
      const response = await fetch('/api/financial/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (!data.success && data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(`Error running analysis: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Financial Analysis Agents</h1>
      
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Run Agent Analysis</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Agent Type</label>
            <select 
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              value={agentType}
              onChange={(e) => setAgentType(e.target.value)}
            >
              <option value="financial">Senior Financial Analyst</option>
              <option value="economic">Economic Analyst</option>
              <option value="news">News Analyst</option>
              <option value="comprehensive">Comprehensive Analysis (All Agents)</option>
            </select>
          </div>
          
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={() => runAnalysis(agentType)}
            disabled={loading}
          >
            {loading ? 'Running Analysis...' : 'Run Analysis'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-8 p-4 bg-red-100 text-red-700 rounded">
          <h3 className="font-bold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      {results && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
          
          {results.results ? (
            // Comprehensive results with multiple agents
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Financial Analysis</h3>
                <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded border">
                  {results.results.financial.analysis}
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Economic Analysis</h3>
                <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded border">
                  {results.results.economic.analysis}
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">News Analysis</h3>
                <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded border">
                  {results.results.news.analysis}
                </div>
              </div>
            </div>
          ) : (
            // Single agent results
            <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded border">
              {results.analysis}
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            <p>Processing metadata:</p>
            <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded mt-1 border">
              {JSON.stringify(results.metadata || results.results?.financial.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 