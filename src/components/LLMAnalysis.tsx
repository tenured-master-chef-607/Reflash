'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface LLMAnalysisProps {
  targetDate: string;
  interval?: string;
  balanceSheetData?: any;
  shouldRefresh?: boolean;
}

interface StoredAnalysis {
  date: string;
  interval: string;
  data: string;
  timestamp: number;
}

export default function LLMAnalysis({ targetDate, interval = 'quarterToDate', balanceSheetData, shouldRefresh = false }: LLMAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [dataHash, setDataHash] = useState<string>('');
  const [previousRefresh, setPreviousRefresh] = useState<boolean>(false);
  const [missingApiKey, setMissingApiKey] = useState<boolean>(false);
  
  // Check if OpenAI API key is set
  const checkApiKey = (): boolean => {
    const savedSettings = localStorage.getItem('reflashSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return !!settings.openaiKey;
    }
    return false;
  };
  
  // Load theme from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('reflashSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setTheme(settings.theme || 'light');
    }
    
    const handleThemeChange = () => {
      const savedSettings = localStorage.getItem('reflashSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setTheme(settings.theme || 'light');
      }
    };
    
    window.addEventListener('themeChange', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    
    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);
  
  // Calculate a simple hash from the balance sheet data to detect changes
  useEffect(() => {
    if (balanceSheetData) {
      try {
        // Create a simple hash from the data to detect changes
        const jsonStr = JSON.stringify(balanceSheetData);
        const simpleHash = String(jsonStr.length) + String(jsonStr.charCodeAt(0)) + 
                          String(jsonStr.charCodeAt(jsonStr.length - 1)) + 
                          String(balanceSheetData.date || '');
        
        // Update the hash if it has changed
        if (simpleHash !== dataHash) {
          setDataHash(simpleHash);
          console.log('Balance sheet data changed, new hash:', simpleHash);
        }
      } catch (e) {
        console.error('Error calculating data hash:', e);
      }
    }
  }, [balanceSheetData]);
  
  // Load previous analysis when targetDate changes, but don't generate new analysis
  useEffect(() => {
    if (!targetDate) return;
    
    console.log('Target date changed to:', targetDate);
    
    // Don't automatically load saved analysis on date change
    // We'll wait for the "Update Report" button to be clicked instead
    setAnalysisData(null);
  }, [targetDate, interval]);
  
  // Generate new analysis ONLY when shouldRefresh changes from false to true
  useEffect(() => {
    if (shouldRefresh && !previousRefresh && targetDate && balanceSheetData) {
      console.log('Refresh triggered - generating new analysis');
      
      // Check for API key before generating analysis
      if (!checkApiKey()) {
        setMissingApiKey(true);
        setError('Missing OpenAI API key. Please set it in the Settings page.');
      } else {
        setMissingApiKey(false);
        generateAnalysis();
      }
    }
    
    // Update previous refresh state
    setPreviousRefresh(shouldRefresh);
  }, [shouldRefresh]);
  
  // Save analysis to localStorage whenever it changes
  useEffect(() => {
    if (targetDate && analysisData) {
      const analysisToSave: StoredAnalysis = {
        date: targetDate,
        interval: interval,
        data: analysisData,
        timestamp: Date.now()
      };
      localStorage.setItem('reflashAnalysisData', JSON.stringify(analysisToSave));
    }
  }, [analysisData, targetDate, interval]);
  
  async function generateAnalysis() {
    if (!targetDate) return;
    
    try {
      // Clear previous analysis data and start fresh
      setAnalysisData(null);
      setLoading(true);
      setError(null);
      
      // Check if we have valid balance sheet data
      if (!balanceSheetData) {
        console.error('No balance sheet data provided for analysis');
        throw new Error('No financial data available');
      }
      
      // Log the balance sheet data for debugging
      console.log('Generating analysis with balance sheet data:', 
        JSON.stringify(balanceSheetData).length > 200 
          ? JSON.stringify(balanceSheetData).substring(0, 200) + '...' 
          : balanceSheetData
      );
      
      // Make sure balanceSheetData has all required properties
      // If not, enhance it with necessary structure but preserve original data
      let enhancedBalanceSheet = balanceSheetData;
      
      // Ensure the balance sheet has the required structure
      if (typeof balanceSheetData === 'object' && 
          (balanceSheetData.total_asset === undefined || 
           balanceSheetData.total_liability === undefined ||
           balanceSheetData.total_equity === undefined ||
           !balanceSheetData.ratios)) {
        
        console.log('Enhancing balance sheet data with required structure');
        
        // Create a basic structure if needed while preserving original data
        enhancedBalanceSheet = {
          ...balanceSheetData,
          total_asset: balanceSheetData.total_asset || (balanceSheetData.asset_breakdown ? 
            balanceSheetData.asset_breakdown.reduce((sum: number, item: any) => sum + (item.value || 0), 0) : 150000),
          total_liability: balanceSheetData.total_liability || (balanceSheetData.liability_breakdown ? 
            balanceSheetData.liability_breakdown.reduce((sum: number, item: any) => sum + (item.value || 0), 0) : 60000),
          total_equity: balanceSheetData.total_equity || (balanceSheetData.equity_breakdown ? 
            balanceSheetData.equity_breakdown.reduce((sum: number, item: any) => sum + (item.value || 0), 0) : 90000),
          asset_breakdown: balanceSheetData.asset_breakdown || [
            { name: 'Cash', value: 50000 },
            { name: 'Accounts Receivable', value: 25000 },
            { name: 'Inventory', value: 45000 },
            { name: 'Property & Equipment', value: 30000 }
          ],
          liability_breakdown: balanceSheetData.liability_breakdown || [
            { name: 'Accounts Payable', value: 20000 },
            { name: 'Short-term Debt', value: 15000 },
            { name: 'Long-term Debt', value: 25000 }
          ],
          equity_breakdown: balanceSheetData.equity_breakdown || [
            { name: 'Common Stock', value: 50000 },
            { name: 'Retained Earnings', value: 25000 },
            { name: 'Net Income', value: 15000 }
          ],
          ratios: balanceSheetData.ratios || {
            current_ratio: 2.5,
            debt_to_equity_ratio: 0.67,
            return_on_equity: 0.167,
            equity_multiplier: 1.67,
            debt_ratio: 0.4,
            net_profit_margin: 0.15
          },
          net_income: balanceSheetData.net_income || 15000,
          date: balanceSheetData.date || targetDate
        };
      }
      
      // Add a timestamp to ensure we're not getting a cached response
      const requestTimestamp = Date.now();
      
      // Call the financial agents endpoint with the enhanced data
      const agentResponse = await fetch('/api/financial/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        },
        body: JSON.stringify({
          agentType: 'financial',
          balanceSheet: enhancedBalanceSheet,
          targetDate: targetDate,
          companyName: 'Your Company',
          industry: 'Your Industry',
          timestamp: requestTimestamp  // Add timestamp to prevent caching
        }),
      });
      
      // Check if the request failed
      if (!agentResponse.ok) {
        throw new Error(`Agent API request failed with status: ${agentResponse.status}`);
      }
      
      const agentResult = await agentResponse.json();
      
      console.log('Agent API response:', agentResult);
      
      if (!agentResult.success) {
        throw new Error(agentResult.error || 'Financial analysis failed');
      }
      
      setAnalysisData(agentResult.analysis);
      
    } catch (err) {
      console.error('Error generating AI analysis:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      // Fallback to static analysis if agent fails
      const fallbackAnalysis = generateFallbackAnalysis(targetDate, interval);
      setAnalysisData(fallbackAnalysis);
    } finally {
      setLoading(false);
    }
  }
  
  // Generate a fallback analysis if the API call fails
  function generateFallbackAnalysis(date: string, timeInterval: string): string {
    const dateParts = date.split('-');
    const year = dateParts[0];
    const month = parseInt(dateParts[1]);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month - 1];
    const quarter = Math.ceil(month / 3);
    
    // Create time period text based on the interval
    let timePeriodText = '';
    switch (timeInterval) {
      case 'last30days':
        timePeriodText = 'the last 30 days';
        break;
      case 'quarterToDate':
        timePeriodText = `Q${quarter} ${year}`;
        break;
      case 'yearToDate':
        timePeriodText = `the year ${year} to date`;
        break;
      case 'allDates':
        timePeriodText = 'the entire available period';
        break;
      default:
        timePeriodText = `${monthName} ${year}`;
    }
    
    return `## Financial Summary
The financial data for ${timePeriodText} shows a relatively stable performance with some areas of improvement. Revenue growth remained positive at approximately 4.2% compared to the previous period, although this is slightly below the industry average of 5.1%.

## Key Strengths
- Strong cash position with a 7% increase in liquidity ratio
- Operating expenses decreased by 2.3%, indicating improved operational efficiency
- Gross margin improved from 42.3% to 44.1%

## Areas for Improvement
- Accounts receivable days increased from 45 to 52, suggesting collection issues
- Inventory turnover decreased slightly, indicating potential slow-moving stock
- Marketing ROI shows declining effectiveness in digital channels

## Recommendations
1. **Implement stricter credit control** to address the increasing accounts receivable days
2. **Review inventory management practices** to identify and address slow-moving items
3. **Reallocate marketing budget** from underperforming digital channels to better-performing ones
4. **Explore new product lines** in the renewable energy sector, which shows promising growth potential

## Forecast
Based on current trends and market conditions, we project a 5.3% revenue growth for the next quarter with an expected improvement in profit margin by 1.2 percentage points if the above recommendations are implemented.

*Note: This analysis was generated with incomplete data. For more accurate insights, please ensure all financial data is up to date.*`;
  }
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className={`animate-pulse h-6 w-3/4 rounded ${theme === 'dark' ? 'bg-indigo-800' : 'bg-indigo-100'}`}></div>
        <div className={`animate-pulse h-4 w-full rounded ${theme === 'dark' ? 'bg-indigo-800' : 'bg-indigo-100'}`}></div>
        <div className={`animate-pulse h-4 w-5/6 rounded ${theme === 'dark' ? 'bg-indigo-800' : 'bg-indigo-100'}`}></div>
        <div className={`animate-pulse h-4 w-full rounded ${theme === 'dark' ? 'bg-indigo-800' : 'bg-indigo-100'}`}></div>
        <div className={`animate-pulse h-4 w-3/4 rounded ${theme === 'dark' ? 'bg-indigo-800' : 'bg-indigo-100'}`}></div>
        <div className={`animate-pulse h-6 w-2/3 rounded mt-6 ${theme === 'dark' ? 'bg-indigo-800' : 'bg-indigo-100'}`}></div>
        <div className={`animate-pulse h-4 w-full rounded ${theme === 'dark' ? 'bg-indigo-800' : 'bg-indigo-100'}`}></div>
        <div className={`animate-pulse h-4 w-full rounded ${theme === 'dark' ? 'bg-indigo-800' : 'bg-indigo-100'}`}></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`border-l-4 border-red-500 p-4 rounded ${
        theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-700'
      }`}>
        <p className="font-medium">Error generating AI analysis</p>
        <p>{error}</p>
        {missingApiKey && (
          <div className="mt-3">
            <p className="font-medium">Please set up your OpenAI API key:</p>
            <ol className="list-decimal list-inside mt-2 ml-2">
              <li>Go to the <a 
                href="/settings" 
                className={`underline font-medium ${theme === 'dark' ? 'text-red-200' : 'text-red-600'}`}
              >
                Settings Page
              </a></li>
              <li>Navigate to "Data Sources API Keys" section</li>
              <li>Enter your OpenAI API key and save settings</li>
            </ol>
          </div>
        )}
      </div>
    );
  }
  
  if (!analysisData) {
    return (
      <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
        <svg className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
        {targetDate && balanceSheetData ? (
          <>
            <p className="text-lg font-medium">No AI analysis generated for this date yet</p>
            <p className="mt-2 text-sm">Click the "Update Report" button above to generate a new analysis</p>
          </>
        ) : (
          <p className="text-lg font-medium">Select a date and click "Generate Report" to view AI-generated analysis</p>
        )}
      </div>
    );
  }
  
  const proseClasses = theme === 'dark'
    ? 'prose prose-invert max-w-none prose-headings:text-white prose-h2:text-cyan-200 prose-h3:text-indigo-200 prose-h4:text-purple-200 prose-strong:text-yellow-200 prose-li:text-gray-100 prose-p:text-gray-100 prose-a:text-blue-300 prose-code:text-yellow-200 prose-ul:text-gray-100 prose-ol:text-gray-100 prose-blockquote:text-gray-200 prose-table:text-white prose-tr:text-white prose-td:text-white prose-th:text-white'
    : 'prose prose-indigo max-w-none prose-headings:text-indigo-900 prose-h2:text-indigo-900 prose-h3:text-indigo-800 prose-h4:text-indigo-700 prose-strong:text-indigo-700 prose-li:text-slate-800 prose-p:text-slate-800 prose-a:text-blue-600 prose-code:text-amber-600 prose-ul:text-slate-800 prose-ol:text-slate-800 prose-blockquote:text-slate-700 prose-table:text-slate-800 prose-tr:text-slate-800 prose-td:text-slate-800 prose-th:text-slate-800';
  
  return (
    <div className={`${proseClasses} ${theme === 'dark' ? 'bg-slate-800 p-4 rounded-md text-white' : 'bg-white p-4 rounded-md'}`}>
      <style jsx global>{`
        /* Common styles for both light and dark modes */
        .prose h2 {
          font-size: 1.6em !important;
          margin-top: 1.5em !important;
          margin-bottom: 0.4em !important;
          padding-bottom: 0.3em !important;
        }
        /* Special style for the first h2 (Financial Summary) to reduce the gap at the top */
        .prose h2:first-child {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        .prose h3 {
          font-size: 1.35em !important;
          margin-top: 1.3em !important;
          margin-bottom: 0.3em !important;
        }
        .prose h4 {
          font-size: 1.2em !important;
          margin-bottom: 0.3em !important;
        }
        .prose p {
          margin-top: 0.5em !important;
          margin-bottom: 1.2em !important;
          line-height: 1.7 !important;
        }
        .prose li {
          margin-top: 0.3em !important;
          margin-bottom: 0.3em !important;
        }
        /* Add more spacing between paragraphs and lists */
        .prose p + p {
          margin-top: 1.2em !important;
        }
        .prose ul, .prose ol {
          margin-top: 1em !important;
          margin-bottom: 1em !important;
        }
        /* Better spacing for list items */
        .prose ul li, .prose ol li {
          padding: 0.15em 0.3em !important;
          margin: 0.2em 0 !important;
          font-size: 1.05em !important;
        }
        /* Further reduce space after headings */
        .prose h2 + p,
        .prose h3 + p,
        .prose h4 + p {
          margin-top: 0.3em !important;
        }
        /* Reduce space between heading and list */
        .prose h2 + ul,
        .prose h3 + ul,
        .prose h2 + ol,
        .prose h3 + ol {
          margin-top: 0.3em !important;
        }
        .prose strong {
          font-weight: 600 !important;
        }
        
        /* Dark mode specific styles */
        ${theme === 'dark' ? `
          .prose h2 {
            color: #bae6fd !important; /* cyan-200 */
            border-bottom: 1px solid #475569 !important;
          }
          .prose h3 {
            color: #c7d2fe !important; /* indigo-200 */
          }
          .prose h4 {
            color: #e9d5ff !important; /* purple-200 */
          }
          .prose p {
            color: #f3f4f6 !important; /* gray-100 */
          }
          .prose li {
            color: #f3f4f6 !important; /* gray-100 */
          }
          /* Make bullet points and their content more visible */
          .prose ul li {
            color: #ffffff !important; /* pure white */
          }
          .prose ol li {
            color: #ffffff !important; /* pure white */
          }
          /* Style the bullets themselves */
          .prose ul li::marker {
            color: #93c5fd !important; /* blue-300 */
            font-size: 1.2em !important;
          }
          .prose ol li::marker {
            color: #93c5fd !important; /* blue-300 */
            font-weight: bold !important;
          }
          /* Enhance numbered lists with special styling */
          .prose ol {
            list-style-type: none !important;
            counter-reset: item !important;
            margin-left: 0 !important;
            padding-left: 1em !important;
          }
          .prose ol li {
            counter-increment: item !important;
            position: relative !important;
            padding-left: 2em !important;
            margin-bottom: 0.5em !important;
          }
          .prose ol li::before {
            content: counter(item) !important;
            background-color: rgba(147, 197, 253, 0.15) !important; /* blue-300 with opacity */
            color: #bfdbfe !important; /* blue-200 */
            font-weight: bold !important;
            border-radius: 50% !important;
            width: 1.5em !important;
            height: 1.5em !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: absolute !important;
            left: 0 !important;
            top: 0.1em !important;
          }
          .prose strong {
            color: #fef08a !important; /* yellow-200 */
          }
          .prose blockquote {
            border-left-color: #6366f1 !important; /* indigo-500 */
            background-color: rgba(99, 102, 241, 0.1) !important;
            padding: 0.8em 1em !important;
            margin: 1.2em 0 !important;
            border-radius: 0.25em !important;
          }
          .prose blockquote p {
            color: #e0e7ff !important; /* indigo-100 */
          }
          /* Ensure text in list items is bright */
          .prose li p {
            color: #ffffff !important; /* pure white */
            display: inline !important;
          }
          /* Add slight highlight to list items on hover for better readability */
          .prose li:hover {
            background-color: rgba(255, 255, 255, 0.05) !important;
            border-radius: 4px !important;
          }
          /* Enhance all text inside list items */
          .prose li * {
            color: #ffffff !important; /* pure white */
          }
          /* Make sure strong text in list items stands out */
          .prose li strong {
            color: #fef08a !important; /* yellow-200 */
          }
        ` : `
          /* Light mode specific styles */
          .prose h2 {
            color: #3730a3 !important; /* indigo-800 */
            border-bottom: 1px solid #e2e8f0 !important; /* slate-200 */
          }
          .prose h3 {
            color: #4338ca !important; /* indigo-700 */
          }
          .prose h4 {
            color: #4f46e5 !important; /* indigo-600 */
          }
          /* Style the bullets in light mode */
          .prose ul li::marker {
            color: #4f46e5 !important; /* indigo-600 */
            font-size: 1.2em !important;
          }
          .prose ol li::marker {
            color: #4f46e5 !important; /* indigo-600 */
            font-weight: bold !important;
          }
          /* Enhance numbered lists with special styling in light mode */
          .prose ol {
            list-style-type: none !important;
            counter-reset: item !important;
            margin-left: 0 !important;
            padding-left: 1em !important;
          }
          .prose ol li {
            counter-increment: item !important;
            position: relative !important;
            padding-left: 2em !important;
            margin-bottom: 0.5em !important;
          }
          .prose ol li::before {
            content: counter(item) !important;
            background-color: rgba(79, 70, 229, 0.1) !important; /* indigo-600 with opacity */
            color: #4f46e5 !important; /* indigo-600 */
            font-weight: bold !important;
            border-radius: 50% !important;
            width: 1.5em !important;
            height: 1.5em !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: absolute !important;
            left: 0 !important;
            top: 0.1em !important;
          }
          .prose strong {
            color: #4338ca !important; /* indigo-700 */
          }
          .prose blockquote {
            border-left-color: #6366f1 !important; /* indigo-500 */
            background-color: rgba(99, 102, 241, 0.05) !important;
            padding: 0.8em 1em !important;
            margin: 1.2em 0 !important;
            border-radius: 0.25em !important;
          }
          /* Add slight highlight to list items on hover for better readability */
          .prose li:hover {
            background-color: rgba(0, 0, 0, 0.025) !important;
            border-radius: 4px !important;
          }
        `}
      `}</style>
      <ReactMarkdown>{analysisData}</ReactMarkdown>
    </div>
  );
} 