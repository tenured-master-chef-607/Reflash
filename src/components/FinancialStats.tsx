'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatRatio } from '@/utils/dataProcessing';

interface FinancialStatsProps {
  data: {
    date: string;
    interval?: string;
    financialData?: any; // Add support for pre-processed financial data
  } | null;
  onDataProcessed?: (processedData: any) => void; // Add callback for notifying when data is processed
}

interface StoredFinancialData {
  date: string;
  interval?: string;
  data: any;
  timestamp: number;
}

export default function FinancialStats({ data, onDataProcessed }: FinancialStatsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Create a stable callback for notifying parent component
  const notifyParent = useCallback((data: any) => {
    if (onDataProcessed) {
      onDataProcessed(data);
    }
  }, [onDataProcessed]);
  
  // Load theme settings
  useEffect(() => {
    // Load theme from localStorage
    const savedSettings = localStorage.getItem('reflashSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setTheme(settings.theme || 'light');
    }
    
    // Listen for theme changes
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
  
  // Try to use pre-processed data if available, otherwise load from localStorage or fetch
  useEffect(() => {
    if (!data?.date) return;
    
    // Check if we have pre-processed data
    if (data.financialData?.targetSheet) {
      setFinancialData(data.financialData);
      
      // Notify parent component immediately if we have data
      if (data.financialData.targetSheet) {
        notifyParent(data.financialData.targetSheet);
      }
      return;
    }
    
    // Check for saved data next
    const savedFinancialData = localStorage.getItem('reflashFinancialData');
    
    if (savedFinancialData) {
      try {
        const storedData: StoredFinancialData = JSON.parse(savedFinancialData);
        
        // Only use stored data if it's for the same date and is less than 24 hours old
        if (storedData.date === data.date) {
          const ageInHours = (Date.now() - storedData.timestamp) / (1000 * 60 * 60);
          
          if (ageInHours < 24) {
            setFinancialData(storedData.data);
            // Notify parent component if we have data from storage
            if (storedData.data.targetSheet) {
              notifyParent(storedData.data.targetSheet);
            }
            return;
          }
        }
      } catch (error) {
        console.error('Error loading saved financial data:', error);
      }
    }
    
    // If we didn't find matching saved data, fetch new data
    fetchFinancialStats();
  }, [data, notifyParent]);
  
  // Save financial data to localStorage when it changes
  useEffect(() => {
    if (data?.date && financialData) {
      const dataToSave: StoredFinancialData = {
        date: data.date,
        interval: data.interval,
        data: financialData,
        timestamp: Date.now()
      };
      
      localStorage.setItem('reflashFinancialData', JSON.stringify(dataToSave));
      
      // Notify parent component when data is processed
      if (financialData.targetSheet) {
        notifyParent(financialData.targetSheet);
      }
    }
  }, [financialData, data, notifyParent]);
  
  async function fetchFinancialStats() {
    if (!data?.date) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch the financial data first
      const finDataRes = await fetch('/api/financial/data');
      const finData = await finDataRes.json();
      
      if (!finData.success) {
        throw new Error(finData.error || 'Failed to fetch financial data');
      }
      
      // Process the data with the selected date and interval
      const processRes = await fetch('/api/financial/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          balanceSheets: finData.data.balanceSheets,
          transactions: finData.data.transactions,
          targetDate: data.date,
          interval: data.interval || 'quarterToDate' // Include interval in the request
        }),
      });
      
      const processData = await processRes.json();
      
      if (!processData.success) {
        throw new Error(processData.error || 'Failed to process financial data');
      }
      
      setFinancialData(processData);
    } catch (err) {
      console.error('Error fetching financial stats:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-indigo-100 h-8 w-3/4 rounded"></div>
        <div className="animate-pulse bg-indigo-100 h-20 rounded"></div>
        <div className="animate-pulse bg-indigo-100 h-20 rounded"></div>
        <div className="animate-pulse bg-indigo-100 h-20 rounded"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
        <p className="font-medium">Error loading financial statistics</p>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!financialData || !financialData.targetSheet) {
    return (
      <div className="text-center text-slate-500 py-8">
        <svg className="w-12 h-12 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p className="text-lg font-medium">Select a date to view financial statistics</p>
      </div>
    );
  }
  
  const { targetSheet } = financialData;
  
  const sectionTitleClass = theme === 'dark' 
    ? 'text-sm font-semibold uppercase text-slate-200 mb-3'
    : 'text-sm font-semibold uppercase text-slate-500 mb-3';
  
  return (
    <div className="space-y-6">
      {/* Balance Sheet Summary */}
      <div>
        <h4 className={sectionTitleClass}>Balance Sheet Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-md ${theme === 'dark' ? 'bg-green-900' : 'bg-green-50'}`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-green-100' : 'text-green-800'}`}>Total Assets</p>
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-green-200' : 'text-green-700'}`}>{formatCurrency(targetSheet.total_asset)}</p>
          </div>
          <div className={`p-3 rounded-md ${theme === 'dark' ? 'bg-red-900' : 'bg-red-50'}`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-100' : 'text-red-800'}`}>Total Liabilities</p>
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-red-200' : 'text-red-700'}`}>{formatCurrency(targetSheet.total_liability)}</p>
          </div>
          <div className={`p-3 rounded-md ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'}`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-100' : 'text-blue-800'}`}>Total Equity</p>
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>{formatCurrency(targetSheet.total_equity)}</p>
          </div>
          <div className={`p-3 rounded-md ${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-50'}`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-purple-100' : 'text-purple-800'}`}>Net Income</p>
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-purple-200' : 'text-purple-700'}`}>{formatCurrency(targetSheet.net_income)}</p>
          </div>
        </div>
      </div>
      
      {/* Key Financial Ratios */}
      <div>
        <h4 className={sectionTitleClass}>Key Financial Ratios</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-md ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Current Ratio</p>
            <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatRatio(targetSheet.ratios.current_ratio)}</p>
          </div>
          <div className={`p-3 rounded-md ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Debt to Equity</p>
            <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatRatio(targetSheet.ratios.debt_to_equity_ratio)}</p>
          </div>
          <div className={`p-3 rounded-md ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Return on Equity</p>
            <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatRatio(targetSheet.ratios.return_on_equity)}</p>
          </div>
          <div className={`p-3 rounded-md ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Debt Ratio</p>
            <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatRatio(targetSheet.ratios.debt_ratio)}</p>
          </div>
        </div>
      </div>
      
      {/* Asset Breakdown */}
      <div>
        <h4 className={sectionTitleClass}>Asset Breakdown</h4>
        <ul className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-100'}`}>
          {targetSheet.asset_breakdown.map((asset: any, index: number) => (
            <li key={index} className="flex justify-between items-center p-2">
              <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>{asset.name}</span>
              <span className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(asset.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 