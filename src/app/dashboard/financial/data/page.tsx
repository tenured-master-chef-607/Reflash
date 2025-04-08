'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { getSupabaseSettings } from '@/utils/supabaseSettings';
import FinancialCharts from '@/components/FinancialCharts';

export default function FinancialDataPage() {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [supabaseInfo, setSupabaseInfo] = useState<{ url: string; key: string }>({ url: '', key: '' });
  const [selectedInterval, setSelectedInterval] = useState<string>('lastYear');
  const [chartData, setChartData] = useState<any>(null);
  
  // Listen for theme changes
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
    
    // Listen for environment variable changes
    const handleEnvironmentChange = () => {
      console.log('Environment variables changed, refreshing data...');
      setLoading(true);
      setError(null);
      // This will re-trigger the data fetching useEffect
      window.location.reload();
    };
    
    window.addEventListener('themeChange', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);
    window.addEventListener('environment-changed', handleEnvironmentChange);
    
    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('environment-changed', handleEnvironmentChange);
    };
  }, []);
  
  // Get Supabase settings for debugging
  useEffect(() => {
    const settings = getSupabaseSettings();
    setSupabaseInfo({
      url: settings.url ? `${settings.url.substring(0, 15)}...` : 'Not set',
      key: settings.key ? `${settings.key.substring(0, 5)}...` : 'Not set',
    });
  }, []);
  
  // Check for available report dates
  const [reportDatesAvailable, setReportDatesAvailable] = useState(false);
  
  useEffect(() => {
    async function checkReportDates() {
      try {
        const response = await fetch('/api/financial/dates');
        const result = await response.json();
        
        setReportDatesAvailable(result.success && result.dates && result.dates.length > 0);
      } catch (error) {
        console.error('Error checking report dates:', error);
      }
    }
    
    checkReportDates();
  }, []);
  
  // Fetch data from the financial API
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/api/financial/data');
        const result = await response.json();
        
        console.log("API response:", result);
        
        if (result.success) {
        setData(result.data);
          
          // Check if we have tables information
          if (result.tables && Array.isArray(result.tables)) {
            setTables(result.tables);
          } else if (result.data && result.data.tables) {
            setTables(result.data.tables);
          }
          
          // Process data for charts based on selected interval
          processDataForCharts(result.data, selectedInterval);
          
          // Check if using fallback data due to missing tables
          if (result.debug && result.debug.usedFallbackTables) {
            console.log("Using fallback tables data");
          }
          
          if (result.debug && result.debug.usedFallbackData) {
            console.log("Using fallback financial data");
          }
        } else {
          setError(result.error || 'Failed to fetch financial data');
        }
      } catch (err) {
        setError('An error occurred while fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Process data for charts based on selected interval
  const processDataForCharts = (financialData: any, interval: string) => {
    if (!financialData) {
      console.error("No financial data provided to processDataForCharts");
      return;
    }
    
    try {
      const now = new Date();
      let startDate = new Date();
      
      // Set the start date based on the selected interval
      switch (interval) {
        case 'last30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'lastQuarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'yearToDate':
          startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
          break;
        case 'lastYear':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case '3years':
          startDate.setFullYear(now.getFullYear() - 3);
          break;
        case '5years':
          startDate.setFullYear(now.getFullYear() - 5);
          break;
        case '10years':
          startDate.setFullYear(now.getFullYear() - 10);
          break;
        case 'all':
          // Set to a very old date to include all data
          startDate = new Date(1970, 0, 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30); // Default to last 30 days
      }
      
      // Check if transactions data exists
      if (!financialData.transactions || !Array.isArray(financialData.transactions)) {
        console.error("No transactions array found in financialData", financialData);
        setChartData({ revenue: [], expense: [], profit: [] });
        return;
      }

      // Check if balanceSheets data exists
      if (!financialData.balanceSheets || !Array.isArray(financialData.balanceSheets)) {
        console.warn("No balanceSheets array found in financialData, will calculate profit from transactions only");
        financialData.balanceSheets = [];
      }
      
      // Filter transactions based on date range
      const filteredTransactions = financialData.transactions.filter((transaction: any) => {
        if (!transaction || !transaction.date) {
          console.warn("Found transaction without date", transaction);
          return false;
        }
        try {
          const transactionDate = new Date(transaction.date);
          return transactionDate >= startDate && transactionDate <= now;
        } catch (err) {
          console.error("Error parsing transaction date", transaction, err);
          return false;
        }
      });
      
      // Find balance sheets within the date range
      const filteredBalanceSheets = financialData.balanceSheets.filter((sheet: any) => {
        if (!sheet || !sheet.date) {
          console.warn("Found balance sheet without date", sheet);
          return false;
        }
        try {
          const sheetDate = new Date(sheet.date);
          return sheetDate >= startDate && sheetDate <= now;
        } catch (err) {
          console.error("Error parsing balance sheet date", sheet, err);
          return false;
        }
      });
      
      console.log(`Filtered data for interval ${interval}:`, {
        transactions: filteredTransactions.length,
        balanceSheets: filteredBalanceSheets.length
      });
      
      // Process the data for charts
      const revenueData = processRevenueData(filteredTransactions);
      const expenseData = processExpenseData(filteredTransactions);
      const profitData = processProfitData(filteredTransactions, filteredBalanceSheets);
      
      console.log("Chart data processed:", {
        revenue: revenueData.length,
        expense: expenseData.length,
        profit: profitData.length
      });
      
      setChartData({
        revenue: revenueData,
        expense: expenseData,
        profit: profitData
      });
    } catch (err) {
      console.error("Error in processDataForCharts:", err);
      setChartData({ revenue: [], expense: [], profit: [] });
    }
  };
  
  // Process revenue data for chart
  const processRevenueData = (transactions: any[]) => {
    try {
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.log("No transactions for revenue data");
        return [];
      }
      
      const revenueByDate: { [key: string]: number } = {};
      
      // Calculate revenue by date
      transactions.forEach((transaction: any) => {
        try {
          if (!transaction) return;
          
          if (transaction.type === 'credit') {
            const date = transaction.date?.split('T')[0];
            if (!date) {
              console.warn("Transaction missing date", transaction);
              return;
            }
            
            const amount = parseFloat(transaction.amount) || 0;
            revenueByDate[date] = (revenueByDate[date] || 0) + amount;
          }
        } catch (err) {
          console.error("Error processing transaction for revenue", transaction, err);
        }
      });
      
      // Convert to array for chart display
      const chartData = Object.entries(revenueByDate).map(([date, amount]) => ({
        date,
        amount
      }));
      
      // Sort by date
      return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (err) {
      console.error("Error in processRevenueData:", err);
      return [];
    }
  };
  
  // Process expense data for chart
  const processExpenseData = (transactions: any[]) => {
    try {
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.log("No transactions for expense data");
        return [];
      }
      
      const expenseByDate: { [key: string]: number } = {};
      
      // Calculate expenses by date
      transactions.forEach((transaction: any) => {
        try {
          if (!transaction) return;
          
          if (transaction.type === 'debit') {
            const date = transaction.date?.split('T')[0];
            if (!date) {
              console.warn("Transaction missing date", transaction);
              return;
            }
            
            const amount = parseFloat(transaction.amount) || 0;
            expenseByDate[date] = (expenseByDate[date] || 0) + amount;
          }
        } catch (err) {
          console.error("Error processing transaction for expense", transaction, err);
        }
      });
      
      // Convert to array for chart display
      const chartData = Object.entries(expenseByDate).map(([date, amount]) => ({
        date,
        amount
      }));
      
      // Sort by date
      return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (err) {
      console.error("Error in processExpenseData:", err);
      return [];
    }
  };
  
  // Process profit data for chart
  const processProfitData = (transactions: any[], balanceSheets: any[]) => {
    try {
      // If we have balance sheets, use net income information
      if (balanceSheets && Array.isArray(balanceSheets) && balanceSheets.length > 0) {
        return balanceSheets.map((sheet: any) => {
          try {
            if (!sheet || !sheet.date) {
              console.warn("Balance sheet missing date", sheet);
              return null;
            }
            
            return {
              date: sheet.date,
              amount: parseFloat(sheet.net_income) || 0
            };
          } catch (err) {
            console.error("Error processing balance sheet for profit", sheet, err);
            return null;
          }
        })
        .filter(item => item !== null)
        .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime());
      }
      
      // Otherwise calculate from transactions
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.log("No transactions for profit data");
        return [];
      }
      
      const profitByDate: { [key: string]: number } = {};
      
      // Calculate revenue and expenses by date
      transactions.forEach((transaction: any) => {
        try {
          if (!transaction) return;
          
          const date = transaction.date?.split('T')[0];
          if (!date) {
            console.warn("Transaction missing date", transaction);
            return;
          }
          
          const amount = parseFloat(transaction.amount) || 0;
          
          if (transaction.type === 'credit') {
            profitByDate[date] = (profitByDate[date] || 0) + amount;
          } else {
            profitByDate[date] = (profitByDate[date] || 0) - amount;
          }
        } catch (err) {
          console.error("Error processing transaction for profit", transaction, err);
        }
      });
      
      // Convert to array for chart display
      const chartData = Object.entries(profitByDate).map(([date, amount]) => ({
        date,
        amount
      }));
      
      // Sort by date
      return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (err) {
      console.error("Error in processProfitData:", err);
      return [];
    }
  };

  // Handle interval change
  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedInterval(e.target.value);
    // Don't trigger immediate data refresh
  };

  // Simulate data loading if there's no real API yet
  useEffect(() => {
    if (!loading && !data && !error) {
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    }
  }, [loading, data, error]);

  const toggleDebugView = () => {
    setShowDebug(!showDebug);
  };

  const refreshData = () => {
    setLoading(true);
    setError(null);
    
    // Fetch data and process with the current selected interval
    async function fetchData() {
      try {
        const response = await fetch('/api/financial/data');
        const result = await response.json();
        
        console.log("API response:", result);
        
        if (result.success) {
          setData(result.data);
          
          // Check if we have tables information
          if (result.tables && Array.isArray(result.tables)) {
            setTables(result.tables);
          } else if (result.data && result.data.tables) {
            setTables(result.data.tables);
          }
          
          // Process data for charts based on selected interval
          processDataForCharts(result.data, selectedInterval);
          
          // Check if using fallback data due to missing tables
          if (result.debug && result.debug.usedFallbackTables) {
            console.log("Using fallback tables data");
          }
          
          if (result.debug && result.debug.usedFallbackData) {
            console.log("Using fallback financial data");
          }
        } else {
          setError(result.error || 'Failed to fetch financial data');
        }
      } catch (err) {
        setError('An error occurred while fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  };

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
      <Header activePage="dashboard" />
      
      <main className="flex-1 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-indigo-900'}`}>Financial Dashboard</h2>
            <div className="flex flex-col items-end">
              <div className="flex space-x-2">
                <select 
                  value={selectedInterval}
                  onChange={handleIntervalChange}
                  className={`px-3 py-2 border rounded-md text-sm ${
                    theme === 'dark' 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <option value="last30days">Last 30 Days</option>
                  <option value="lastQuarter">Last Quarter</option>
                  <option value="yearToDate">Year to Date</option>
                  <option value="lastYear">Last Year</option>
                  <option value="3years">3 Years</option>
                  <option value="5years">5 Years</option>
                  <option value="10years">10 Years</option>
                  <option value="all">All Time</option>
                </select>
                <button 
                  onClick={refreshData}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    theme === 'dark'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  Refresh Data
                </button>
                <button 
                  onClick={toggleDebugView}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    theme === 'dark'
                      ? `${showDebug ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-600 hover:bg-slate-700'} text-white`
                      : `${showDebug ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-500 hover:bg-slate-600'} text-white`
                  }`}
                >
                  {showDebug ? 'Hide Debug' : 'Show Debug'}
                </button>
              </div>
              <p className={`text-xs mt-1 italic ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Select interval and click "Refresh Data" to update charts
              </p>
            </div>
          </div>
          
          {/* Supabase Status */}
          <div className={`mb-5 p-4 rounded-lg border ${
            theme === 'dark' 
              ? 'bg-slate-800 border-slate-700' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center justify-between">
              <h3 className={`text-sm font-medium ${
                theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'
              }`}>Supabase Connection</h3>
              
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>URL:</span>
                  <span className={`ml-1 font-mono ${
                    supabaseInfo.url === 'Not set' 
                      ? (theme === 'dark' ? 'text-red-400' : 'text-red-500')
                      : (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                  }`}>{supabaseInfo.url}</span>
                </div>
                <div className="flex items-center">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>API Key:</span>
                  <span className={`ml-1 font-mono ${
                    supabaseInfo.key === 'Not set' 
                      ? (theme === 'dark' ? 'text-red-400' : 'text-red-500')
                      : (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                  }`}>{supabaseInfo.key}</span>
                </div>
                <div className="flex items-center">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Status:</span>
                  <Link href="/settings" className={`ml-1 underline ${
                    supabaseInfo.url === 'Not set' || supabaseInfo.key === 'Not set'
                      ? (theme === 'dark' ? 'text-red-400' : 'text-red-500')
                      : (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                  }`}>
                    {supabaseInfo.url === 'Not set' || supabaseInfo.key === 'Not set'
                      ? 'Configuration needed'
                      : 'Configured'}
                  </Link>
                </div>
                <div>
                  <button
                    onClick={() => window.location.href = '/settings'}
                    className={`px-2 py-1 rounded text-xs ${
                      theme === 'dark'
                        ? 'bg-indigo-700 hover:bg-indigo-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {supabaseInfo.url === 'Not set' || supabaseInfo.key === 'Not set' 
                      ? 'Configure Supabase' 
                      : 'Modify Settings'}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs italic">
              {data?.usedFallback || (data && tables.length === 0) ? (
                <div className={theme === 'dark' ? 'text-amber-300' : 'text-amber-600'}>
                  <p>Using fallback data because required tables are missing or Supabase connection failed.</p>
                  <Link href="/settings" className="underline">
                    Go to Settings and click "Create Required Tables" after connecting to Supabase.
                  </Link>
                </div>
              ) : supabaseInfo.url === 'Not set' || supabaseInfo.key === 'Not set' ? (
                <div className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                  No Supabase connection configured. Go to Settings to set up.
                </div>
              ) : tables.length > 0 ? (
                <div className={theme === 'dark' ? 'text-green-300' : 'text-green-600'}>
                  {tables.length} database tables configured and ready to use.
                </div>
              ) : (
                <div className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                  Supabase configured, but no tables found. Go to Settings to create tables.
                </div>
              )}
            </div>
          </div>
          
          {/* Reports Notification */}
          {reportDatesAvailable && (
            <div className={`mb-5 p-4 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-indigo-900 border-indigo-800' 
                : 'bg-indigo-50 border-indigo-100'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'
                  }`}>Financial Reports Available</h3>
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-indigo-200' : 'text-indigo-600'
                  }`}>
                    Financial report dates are available. Generate detailed reports with analysis.
                  </p>
                </div>
                <Link
                  href="/reports"
                  className={`px-3 py-1.5 rounded text-xs font-medium ${
                    theme === 'dark'
                      ? 'bg-indigo-700 hover:bg-indigo-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  View Reports
                </Link>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="loading"></div>
            </div>
          ) : error ? (
            <div className={`p-6 rounded-lg text-center ${
              theme === 'dark' 
                ? 'bg-red-900 text-red-200 border border-red-800' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              <h3 className="text-xl font-bold mb-2">Error Loading Data</h3>
              <p>{error}</p>
              <div className="mt-4">
                <Link href="/settings" className={`inline-block underline ${
                  theme === 'dark' ? 'text-red-200' : 'text-red-600'
                }`}>
                  Check Supabase settings
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className={`p-6 rounded-lg shadow-sm border ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-slate-200'
                }`}>
                  <h3 className={`text-lg font-medium mb-4 pb-2 border-b ${
                    theme === 'dark' ? 'text-indigo-300 border-slate-700' : 'text-indigo-900 border-slate-100'
                  }`}>Revenue Overview</h3>
                  <div className="h-80">
                    <FinancialCharts data={{ date: new Date().toISOString().split('T')[0], interval: selectedInterval, chartType: 'revenue' }} />
                  </div>
                </div>
                
                <div className={`p-6 rounded-lg shadow-sm border ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-slate-200'
                }`}>
                  <h3 className={`text-lg font-medium mb-4 pb-2 border-b ${
                    theme === 'dark' ? 'text-indigo-300 border-slate-700' : 'text-indigo-900 border-slate-100'
                  }`}>Expense Analysis</h3>
                  <div className="h-80">
                    <FinancialCharts data={{ date: new Date().toISOString().split('T')[0], interval: selectedInterval, chartType: 'expense' }} />
                  </div>
                </div>
                
                <div className={`p-6 rounded-lg shadow-sm border ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-slate-200'
                }`}>
                  <h3 className={`text-lg font-medium mb-4 pb-2 border-b ${
                    theme === 'dark' ? 'text-indigo-300 border-slate-700' : 'text-indigo-900 border-slate-100'
                  }`}>Profit Margin</h3>
                  <div className="h-80">
                    <FinancialCharts data={{ date: new Date().toISOString().split('T')[0], interval: selectedInterval, chartType: 'profit' }} />
                  </div>
                </div>
              </div>
              
              {/* Detailed Financial Charts */}
              <div className={`mb-8 p-6 rounded-lg shadow-sm border ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-white border-slate-200'
              }`}>
                <h3 className={`text-lg font-medium mb-4 pb-2 border-b ${
                  theme === 'dark' ? 'text-indigo-300 border-slate-700' : 'text-indigo-900 border-slate-100'
                }`}>Detailed Financial Charts</h3>
                <FinancialCharts data={{ date: new Date().toISOString().split('T')[0], interval: selectedInterval }} />
              </div>
              
              {/* Debug Sections */}
              {showDebug && (
                <div className={`rounded-lg shadow-sm border p-6 ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-slate-200'
                }`}>
                  <h3 className={`text-xl font-bold mb-6 ${
                    theme === 'dark' ? 'text-indigo-300' : 'text-indigo-900'
                  }`}>Debug Information</h3>
                  
                  <div className="mb-8">
                    <h4 className={`text-lg font-medium mb-3 ${
                      theme === 'dark' ? 'text-indigo-200 border-slate-700' : 'text-indigo-800 border-slate-200'
                    } border-b pb-1`}>
                      Available Financial Tables
                    </h4>
                {tables.length > 0 ? (
                      <ul className={`list-disc pl-6 space-y-1 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                    {tables.map(table => (
                          <li key={table}>{table}</li>
                    ))}
                  </ul>
                ) : (
                      <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        No tables found. Please go to Settings and click "Create Required Tables".
                      </p>
                )}
              </div>
              
              {data && (
                <>
                      <div className="mb-8">
                        <h4 className={`text-lg font-medium mb-3 ${
                          theme === 'dark' ? 'text-indigo-200 border-slate-700' : 'text-indigo-800 border-slate-200'
                        } border-b pb-1`}>
                          Accounts
                        </h4>
                    {data.accounts && data.accounts.length > 0 ? (
                          <pre className={`p-4 rounded-lg overflow-auto max-h-96 text-sm ${
                            theme === 'dark' 
                              ? 'bg-slate-900 border border-slate-700 text-slate-300' 
                              : 'bg-slate-50 border border-slate-200 text-slate-800'
                          }`}>
                        {JSON.stringify(data.accounts, null, 2)}
                      </pre>
                    ) : (
                          <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            No accounts data found. Please go to Settings and click "Create Required Tables".
                          </p>
                    )}
                  </div>
                  
                      <div className="mb-8">
                        <h4 className={`text-lg font-medium mb-3 ${
                          theme === 'dark' ? 'text-indigo-200 border-slate-700' : 'text-indigo-800 border-slate-200'
                        } border-b pb-1`}>
                          Balance Sheets
                        </h4>
                    {data.balanceSheets && data.balanceSheets.length > 0 ? (
                          <pre className={`p-4 rounded-lg overflow-auto max-h-96 text-sm ${
                            theme === 'dark' 
                              ? 'bg-slate-900 border border-slate-700 text-slate-300' 
                              : 'bg-slate-50 border border-slate-200 text-slate-800'
                          }`}>
                        {JSON.stringify(data.balanceSheets, null, 2)}
                      </pre>
                    ) : (
                          <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            No balance sheets data found. Please go to Settings and click "Create Required Tables".
                          </p>
                    )}
                  </div>
                  
                      <div className="mb-8">
                        <h4 className={`text-lg font-medium mb-3 ${
                          theme === 'dark' ? 'text-indigo-200 border-slate-700' : 'text-indigo-800 border-slate-200'
                        } border-b pb-1`}>
                          Transactions
                        </h4>
                    {data.transactions && data.transactions.length > 0 ? (
                      <div>
                            <pre className={`p-4 rounded-lg overflow-auto max-h-96 text-sm ${
                              theme === 'dark' 
                                ? 'bg-slate-900 border border-slate-700 text-slate-300' 
                                : 'bg-slate-50 border border-slate-200 text-slate-800'
                            }`}>
                          {JSON.stringify(data.transactions.slice(0, 10), null, 2)}
                        </pre>
                        {data.transactions.length > 10 && (
                              <div className={`mt-2 text-sm font-medium ${
                                theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                              }`}>
                            Showing 10 of {data.transactions.length} transactions...
                          </div>
                        )}
                      </div>
                    ) : (
                          <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            No transactions data found. Please go to Settings and click "Create Required Tables".
                          </p>
                    )}
                  </div>
                </>
              )}
            </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <footer className={`py-4 text-center text-xs border-t ${
        theme === 'dark'
          ? 'bg-slate-800 text-slate-400 border-slate-700'
          : 'bg-white text-slate-500 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
            Reflash Financial Analytics © {new Date().getFullYear()} • Advanced Financial Insights
        </div>
      </footer>
    </div>
  );
} 