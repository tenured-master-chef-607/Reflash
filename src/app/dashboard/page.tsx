'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { getSupabaseSettings } from '@/utils/supabaseSettings';
import FinancialCharts from '@/components/FinancialCharts';
import { testSupabaseConnection } from '@/utils/testSupabase';
import { updateEnvFromSettings, notifyEnvironmentChanged } from '@/utils/environmentOverrides';
import { fallbackData } from '@/utils/fallbackData';

// Function to securely set cookies for Supabase credentials
function setCookiesForSupabase(url: string, key: string) {
  // Set cookies with secure flag if in production
  // These will be read by middleware and forwarded to server components via headers
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = '; SameSite=Lax'; // Use Lax to allow page redirections to include cookie
  
  // Set cookies with 7-day expiration (or adjust as needed)
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  
  // Set cookies for both the URL and key
  // Make sure URL is properly encoded - Supabase URLs contain : and // which need encoding
  const encodedUrl = encodeURIComponent(url);
  const encodedKey = encodeURIComponent(key);
  
  // Debug
  console.log('Setting cookies with values:', {
    originalUrl: url.substring(0, 15) + '...',
    encodedUrl: encodedUrl.substring(0, 15) + '...',
  });
  
  document.cookie = `supabase-url=${encodedUrl}; path=/; expires=${expires.toUTCString()}${secure}${sameSite}`;
  document.cookie = `supabase-key=${encodedKey}; path=/; expires=${expires.toUTCString()}${secure}${sameSite}`;
}

// Create a safe localStorage function to prevent SSR errors
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

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
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  
  // Inline Supabase configuration form state
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [configTesting, setConfigTesting] = useState(false);
  const [configTestResult, setConfigTestResult] = useState<{success: boolean; message: string} | null>(null);
  
  // Listen for theme changes
  useEffect(() => {
    // Load theme from localStorage
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('reflashSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setTheme(settings.theme || 'light');
      }
    }
    
    // Listen for theme changes
    const handleThemeChange = () => {
      if (typeof window !== 'undefined') {
        const savedSettings = localStorage.getItem('reflashSettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setTheme(settings.theme || 'light');
        }
      }
    };
    
    // Listen for environment variable changes
    const handleEnvironmentChange = (e: Event) => {
      console.log('Environment variables changed, refreshing data...');
      
      // Check if we should skip reload (for server-side updates)
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.skipReload) {
        console.log('Skipping reload as requested');
        return;
      }
      
      // Just refresh data without page reload
      refreshData();
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
  
  // Improved initial load logic
  useEffect(() => {
    // Initial check for Supabase credentials
    const settings = getSupabaseSettings();
    
    // Set the form state with any existing credentials
    if (settings.url) setSupabaseUrl(settings.url);
    if (settings.key) setSupabaseKey(settings.key);
    
    setSupabaseInfo({
      url: settings.url ? `${settings.url.substring(0, 15)}...` : 'Not set',
      key: settings.key ? `${settings.key.substring(0, 5)}...` : 'Not set',
    });
    
    // No longer show credentials form on dashboard
    setLoading(false);
  }, []);
  
  // Check for available report dates
  const [reportDatesAvailable, setReportDatesAvailable] = useState(false);
  
  useEffect(() => {
    async function checkReportDates() {
      try {
        // Get current Supabase settings to check if credentials exist
        const { url: supabaseUrl, key: supabaseKey } = getSupabaseSettings();
        
        // Only fetch data if credentials exist
        if (!supabaseUrl || !supabaseKey) {
          setReportDatesAvailable(false);
          return;
        }
        
        const response = await fetch('/api/financial/dates', {
          headers: {
            // Add credentials to headers
            'X-Supabase-URL': supabaseUrl,
            'X-Supabase-Key': supabaseKey,
          }
        });
        const result = await response.json();
        
        setReportDatesAvailable(result.success && result.dates && result.dates.length > 0);
      } catch (error) {
        console.error('Error checking report dates:', error);
        setReportDatesAvailable(false);
      }
    }
    
    checkReportDates();
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
    
    // Always get fresh settings directly from localStorage and environment
    const freshSettings = getSupabaseSettings();
    const supabaseUrl = freshSettings.url;
    const supabaseKey = freshSettings.key;
    
    console.log('Refreshing with current credentials:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseKey,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : 'Not set' 
    });
    
    // Always update the Supabase info display to reflect what's in settings
    setSupabaseInfo({
      url: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'Not set',
      key: supabaseKey ? `${supabaseKey.substring(0, 5)}...` : 'Not set',
    });
    
    // Check if user has skipped configuration
    const userSkipped = localStorage.getItem('userSkippedCredentials') === 'true';
    
    // If credentials don't exist or the user previously skipped after a failed test,
    // use demo data but don't show an error or credentials form
    if (!supabaseUrl || !supabaseKey || userSkipped) {
      console.log('Using demo data - credentials missing or user skipped');
      setLoading(false);
      
      // Use fallback data instead of showing an error
      const fallbackDataWithFlag = {
        accounts: fallbackData.accounts,
        balanceSheets: fallbackData.balanceSheets,
        transactions: fallbackData.transactions,
        usedFallback: true
      };
      
      // Set the data with fallback values
      setData(fallbackDataWithFlag);
      
      // Process the fallback data for charts
      processDataForCharts(fallbackDataWithFlag, selectedInterval);
      
      // Use a consistent message regardless of how they got here
      setError('Using demo data. Connect to Supabase in Settings to use your own data.');
      return;
    }
    
    // Clear error before fetching
    setError(null);
    
    // Before making API call, ensure environment variables are set with latest credentials
    updateEnvFromSettings({ supabaseUrl, supabaseKey });
    
    // Fetch data and process with the current selected interval
    async function fetchData() {
      try {
        // Get fresh credentials to ensure we're using the latest
        const { url: freshUrl, key: freshKey } = getSupabaseSettings();
        
        // Add a cache buster only for development
        const cacheBuster = process.env.NODE_ENV === 'development' ? `?t=${Date.now()}` : '';
        const response = await fetch(`/api/financial/data${cacheBuster}`, {
          headers: {
            // Add the credentials to the request headers to ensure the latest are used
            'X-Supabase-URL': freshUrl || '',
            'X-Supabase-Key': freshKey || '',
          }
        });
        
        // Check for network errors or server failures
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        // Check if API reported connection status as not configured
        const connectionStatus = response.headers.get('X-Supabase-Status');
        if (connectionStatus === 'not-configured') {
          console.log('API reported Supabase connection as not configured, using placeholder data');
        }
        
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
          
          // If not using fallback data, clear the userSkippedCredentials flag
          if (!result.debug?.usedFallbackData && !result.debug?.usedFallbackTables) {
            localStorage.removeItem('userSkippedCredentials');
            // Clear any existing error message about demo data
            if (error && error.includes('demo data')) {
              setError(null);
            }
          }
          
          // Skip showing credentials form even if API indicates credentials issues
          if (result.debug && result.debug.needsCredentials) {
            // Just set an error message, no credentials form
            const msg = 'Using demo data. You can connect to Supabase in Settings to use your own data.';
            setError(msg);
            return;
          }
          
          // Handle detailed error messages from API even on "success" responses
          if (result.debug && result.debug.errorMessage) {
            // Don't show credentials form regardless of error type
            if (result.debug.errorType === 'missing_credentials' || 
                connectionStatus === 'not-configured' ||
                (result.debug.errorMessage && (
                  result.debug.errorMessage.includes('Supabase credentials not found') || 
                  result.debug.errorMessage.includes('missing') ||
                  result.debug.errorMessage.includes('not configured')))) {
              // Just set error message without showing form
              setError('Using demo data. Configure Supabase in Settings to use your own data.');
            } else {
              setError(`Refresh completed with issues: ${result.debug.errorMessage}`);
            }
          } else if (result.debug && result.debug.usedFallbackData) {
            console.log("Using fallback financial data");
            
            // Check if fallback data was used even though credentials exist
            // This might mean the tables don't exist or there's a connection issue
            if (supabaseUrl && supabaseKey) {
              setError('Refresh completed with fallback data: Connected to Supabase but tables may be missing. Go to Settings to create required tables.');
            }
            
            // If using fallback data, set a longer refresh interval
            // This reduces unnecessary API calls when we know credentials are missing
            if (autoRefreshRef.current) {
              clearInterval(autoRefreshRef.current);
              // Set a much longer refresh interval (5 minutes) for fallback data
              autoRefreshRef.current = setInterval(refreshData, 5 * 60 * 1000);
            }
          } else {
            console.log("Refresh completed successfully with actual Supabase data");
          }
        } else {
          // API returned success:false - a real error, not just missing credentials
          const errorMsg = result.debug?.errorMessage || result.error || 'Refresh data failed: Unable to fetch financial data from Supabase.';
          
          // Check if error is related to missing credentials
          if (result.debug?.errorType === 'missing_credentials' || 
              (errorMsg && (
                errorMsg.includes('Supabase credentials not found') || 
                errorMsg.includes('missing')))) {
            // Just set an error message without showing credentials form
            setError('Using demo data. You can connect to Supabase in Settings to use your own data.');
          } else {
            setError(errorMsg);
          }
        }
      } catch (err) {
        console.error('Error during data refresh:', err);
        setError(`Refresh data failed: ${err instanceof Error ? err.message : 'An unexpected error occurred.'}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  };

  // Handle saving Supabase credentials from the inline form
  const handleSaveCredentials = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setConfigTestResult({
        success: false,
        message: 'Please enter both Supabase URL and API Key'
      });
      return;
    }

    // Validate URL format
    if (!supabaseUrl.startsWith('https://')) {
      setConfigTestResult({
        success: false,
        message: 'Supabase URL must start with https://'
      });
      return;
    }
    
    // Sanitize URL - remove trailing slashes, decode if already encoded
    let sanitizedUrl = supabaseUrl.trim();
    
    // Remove trailing slash if present
    sanitizedUrl = sanitizedUrl.replace(/\/$/, '');
    
    // Decode URL if it's already encoded (contains %)
    if (sanitizedUrl.includes('%')) {
      try {
        sanitizedUrl = decodeURIComponent(sanitizedUrl);
      } catch (e) {
        console.warn('Failed to decode URL, using as-is:', e);
      }
    }
    
    // Trim the key
    const sanitizedKey = supabaseKey.trim();

    setConfigTesting(true);
    setConfigTestResult(null);

    try {
      // Test connection first
      const result = await testSupabaseConnection(sanitizedUrl, sanitizedKey);
      
      setConfigTestResult(result);
      
      // Save settings to localStorage regardless of test result
      const settings = localStorage.getItem('reflashSettings') 
        ? JSON.parse(localStorage.getItem('reflashSettings') || '{}') 
        : {};
      
      settings.supabaseUrl = sanitizedUrl;
      settings.supabaseKey = sanitizedKey;
      
      localStorage.setItem('reflashSettings', JSON.stringify(settings));
      
      // Set cookies for server-side access
      setCookiesForSupabase(sanitizedUrl, sanitizedKey);
      
      // Update environment overrides
      updateEnvFromSettings(settings);
      notifyEnvironmentChanged();
      
      // Update supabase info state immediately
      setSupabaseInfo({
        url: sanitizedUrl ? `${sanitizedUrl.substring(0, 15)}...` : 'Not set',
        key: sanitizedKey ? `${sanitizedKey.substring(0, 5)}...` : 'Not set',
      });
      
      if (result.success) {
        // Remove the 'userSkippedCredentials' flag if it was set previously
        // This ensures demo data option won't be shown when connection is successful
        localStorage.removeItem('userSkippedCredentials');
        
        // Close form
        setShowCredentialsForm(false);
        
        // Clear error if it was related to credentials
        if (error && (error.includes('credentials') || error.includes('Supabase'))) {
          setError(null);
        } else {
          // Set a success message
          setError('Connected successfully! Using your Supabase data.');
        }
      } else {
        // If connection failed, allow using demo data option but keep the form open
        localStorage.setItem('userSkippedCredentials', 'true');
        setError(`Connection failed: ${result.message}. You can try again or use demo data.`);
      }
      
      // Refresh the data regardless of the connection result
      setTimeout(() => {
        refreshData();
      }, 500);
    } catch (error) {
      // If connection test errored, allow using demo data option
      localStorage.setItem('userSkippedCredentials', 'true');
      
      setConfigTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setError(`Connection error: ${error instanceof Error ? error.message : String(error)}. Using demo data.`);
      
      // Still refresh with fallback data
      setTimeout(() => {
        refreshData();
      }, 500);
    } finally {
      setConfigTesting(false);
    }
  };

  // Initial useEffect for data fetching and setting up auto-refresh
  useEffect(() => {
    // Always fetch data immediately
    refreshData();
    
    // When the selectedInterval changes, update the refresh interval
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }
    
    // Define refresh intervals based on selected time range
    let refreshInterval = 30 * 1000; // Default: 30 seconds
    
    // Longer intervals for longer time ranges
    if (selectedInterval === '3years' || selectedInterval === '5years' || selectedInterval === '10years' || selectedInterval === 'all') {
      refreshInterval = 5 * 60 * 1000; // 5 minutes for historical data
    } else if (selectedInterval === 'lastYear' || selectedInterval === 'yearToDate') {
      refreshInterval = 2 * 60 * 1000; // 2 minutes for yearly data
    }
    
    // Set up auto-refresh with the appropriate interval
    autoRefreshRef.current = setInterval(refreshData, refreshInterval);
    
    // Clean up on unmount or when interval changes
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [selectedInterval]); // Only depend on selectedInterval now

  // Add this effect in the component, near the other useEffect calls
  useEffect(() => {
    // Function to check if server credentials are set properly
    async function checkServerCredentials() {
      try {
        const response = await fetch('/api/env-sync');
        const result = await response.json();
        
        if (result.success && result.settings && result.settings.url && result.settings.key) {
          console.log('Server credentials are properly set, refreshing data...');
          // If server has credentials but we still have an error showing, refresh the data
          if (error && (error.includes('credentials') || error.includes('Supabase'))) {
            refreshData();
          }
        }
      } catch (e) {
        console.error('Error checking server credentials:', e);
      }
    }
    
    // Only run this check if there's an error about credentials
    if (error && (error.includes('credentials') || error.includes('Supabase'))) {
      checkServerCredentials();
    }
  }, [error]);

  // Listen for settings changes (from any source)
  useEffect(() => {
    // Function to handle any settings changes
    const handleSettingsChange = () => {
      console.log('Settings changed, refreshing dashboard data');
      refreshData();
    };
    
    // Add event listeners for both localStorage changes and our custom events
    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener('supabase-credentials-changed', handleSettingsChange);
    window.addEventListener('supabase-connection-tested', handleSettingsChange);
    
    return () => {
      window.removeEventListener('storage', handleSettingsChange);
      window.removeEventListener('supabase-credentials-changed', handleSettingsChange);
      window.removeEventListener('supabase-connection-tested', handleSettingsChange);
    };
  }, []);

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
              }`}>Supabase Connection (Optional)</h3>
              
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>URL:</span>
                  <span className={`ml-1 font-mono ${
                    supabaseInfo.url === 'Not set' 
                      ? (theme === 'dark' ? 'text-amber-400' : 'text-amber-500')
                      : (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                  }`}>{supabaseInfo.url}</span>
                </div>
                <div className="flex items-center">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>API Key:</span>
                  <span className={`ml-1 font-mono ${
                    supabaseInfo.key === 'Not set' 
                      ? (theme === 'dark' ? 'text-amber-400' : 'text-amber-500')
                      : (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                  }`}>{supabaseInfo.key}</span>
                </div>
                <div className="flex items-center">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Status:</span>
                  <Link href="/settings" className={`ml-1 underline ${
                    supabaseInfo.url === 'Not set' || supabaseInfo.key === 'Not set' || 
                    (error && error.includes('not configured')) ||
                    safeLocalStorage.getItem('userSkippedCredentials') === 'true'
                      ? (theme === 'dark' ? 'text-amber-400' : 'text-amber-500')
                      : (theme === 'dark' ? 'text-green-400' : 'text-green-600')
                  }`}>
                    {supabaseInfo.url === 'Not set' || supabaseInfo.key === 'Not set' || 
                     safeLocalStorage.getItem('userSkippedCredentials') === 'true'
                      ? 'Not configured (using demo data)'
                      : error && error.includes('not configured')
                        ? 'Not configured (connection error - using demo data)'
                        : 'Configured'}
                  </Link>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (supabaseInfo.url === 'Not set' || supabaseInfo.key === 'Not set' || safeLocalStorage.getItem('userSkippedCredentials') === 'true') {
                        setShowCredentialsForm(true); 
                      } else {
                        window.location.href = '/settings';
                      }
                    }}
                    className={`px-2 py-1 rounded text-xs ${
                      theme === 'dark'
                        ? 'bg-indigo-700 hover:bg-indigo-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {supabaseInfo.url === 'Not set' || supabaseInfo.key === 'Not set' || safeLocalStorage.getItem('userSkippedCredentials') === 'true'
                      ? 'Connect to Supabase' 
                      : 'Modify Settings'}
                  </button>
                  
                  {(supabaseInfo.url !== 'Not set' && supabaseInfo.key !== 'Not set') && (
                    <button
                      onClick={async () => {
                        try {
                          // Show basic toast message
                          alert('Testing connection... This may take a moment.');
                          
                          // Call the test connection API
                          const response = await fetch('/api/test-connection');
                          const result = await response.json();
                          
                          // Display the test results
                          if (result.success) {
                            // Remove userSkippedCredentials flag when connection test succeeds
                            safeLocalStorage.removeItem('userSkippedCredentials');
                            alert(`Connection test successful! Database is accessible.`);
                          } else {
                            // Set userSkippedCredentials flag when connection test fails
                            safeLocalStorage.setItem('userSkippedCredentials', 'true');
                            alert(`Connection test failed. Details:\n\n${
                              result.tests?.errorDetails?.basicTest || 
                              result.tests?.errorDetails?.tableTest ||
                              result.message || 
                              'Unknown error'
                            }\n\nYou can use demo data until connection is fixed.`);
                          }
                        } catch (e) {
                          // Set userSkippedCredentials flag when connection test errors
                          safeLocalStorage.setItem('userSkippedCredentials', 'true');
                          alert(`Error testing connection: ${e instanceof Error ? e.message : String(e)}\n\nYou can use demo data until connection is fixed.`);
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs ${
                        theme === 'dark'
                          ? 'bg-green-700 hover:bg-green-600 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      Test Connection
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs italic">
              {data?.usedFallback || (data && tables.length === 0) ? (
                <div className={`${error && (error.includes('demo data') || error.includes('Using demo data')) ? '' : 'flex justify-between items-center'} ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  <p>Currently using demo data. Connect to Supabase for working with your own financial data.</p>
                  {!error || (!error.includes('demo data') && !error.includes('Using demo data')) ? (
                    <Link 
                      href="/settings" 
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md ml-2 ${
                        theme === 'dark' 
                          ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                    >
                      Go to Settings
                    </Link>
                  ) : null}
                </div>
              ) : supabaseInfo.url === 'Not set' || supabaseInfo.key === 'Not set' || safeLocalStorage.getItem('userSkippedCredentials') === 'true' ? (
                <div className={`${error && (error.includes('demo data') || error.includes('Using demo data')) ? '' : 'flex justify-between items-center'} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  <p>Using demo data. Click "Connect to Supabase" above to use your own database.</p>
                  {!error || (!error.includes('demo data') && !error.includes('Using demo data')) ? (
                    <Link 
                      href="/settings" 
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md ml-2 ${
                        theme === 'dark' 
                          ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                    >
                      Go to Settings
                    </Link>
                  ) : null}
                </div>
              ) : tables.length > 0 ? (
                <div className={theme === 'dark' ? 'text-green-300' : 'text-green-600'}>
                  {tables.length} database tables configured and ready to use.
                </div>
              ) : (
                <div className={`${error && (error.includes('demo data') || error.includes('Using demo data')) ? '' : 'flex justify-between items-center'} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  <p>Supabase configured, but no tables found. Go to Settings to create tables.</p>
                  {!error || (!error.includes('demo data') && !error.includes('Using demo data')) ? (
                    <Link 
                      href="/settings" 
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md ml-2 ${
                        theme === 'dark' 
                          ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                    >
                      Go to Settings
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          
          {/* Credentials Modal */}
          {showCredentialsForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className={`rounded-lg shadow-xl max-w-md w-full p-6 ${
                theme === 'dark' ? 'bg-slate-800' : 'bg-white'
              }`}>
                <h2 className={`text-xl font-bold mb-4 ${
                  theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'
                }`}>
                  Connect to Supabase (Optional)
                </h2>
                
                <p className={`mb-4 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  To use your own Supabase database, please enter your credentials below.
                  You can also close this form to continue using demo data.
                </p>
                
                <div className="mb-4">
                  <label htmlFor="supabaseUrl" className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Supabase URL
                  </label>
                  <input
                    type="text"
                    id="supabaseUrl"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                            ${theme === 'dark' 
                              ? 'bg-slate-700 border-slate-600 text-white' 
                              : 'bg-white border-slate-300 text-slate-800'}`}
                    placeholder="https://your-project.supabase.co"
                  />
                  <p className={`mt-1 text-xs ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Example: https://abcdefg.supabase.co
                  </p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="supabaseKey" className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Supabase API Key
                  </label>
                  <input
                    type="password"
                    id="supabaseKey"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                            ${theme === 'dark' 
                              ? 'bg-slate-700 border-slate-600 text-white' 
                              : 'bg-white border-slate-300 text-slate-800'}`}
                    placeholder="your-supabase-anon-key"
                  />
                  <p className={`mt-1 text-xs ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Use the anon/public key (starts with "eyJh...")
                  </p>
                </div>
                
                {/* Test result message */}
                {configTestResult && (
                  <div className={`p-3 mb-4 rounded-md ${
                    configTestResult.success
                      ? (theme === 'dark' ? 'bg-green-900/20 text-green-300' : 'bg-green-50 text-green-800')
                      : (theme === 'dark' ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-800')
                  }`}>
                    {configTestResult.message}
                  </div>
                )}
                
                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      // Set userSkippedCredentials flag when user chooses to use demo data
                      safeLocalStorage.setItem('userSkippedCredentials', 'true');
                      // Close the form
                      setShowCredentialsForm(false);
                      // Refresh data to load demo data
                      refreshData();
                    }}
                    className={`px-4 py-2 rounded ${
                      theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    Use Demo Data
                  </button>
                  <div className="space-x-2">
                    <button
                      onClick={() => {
                        // Set userSkippedCredentials flag when canceling too
                        safeLocalStorage.setItem('userSkippedCredentials', 'true');
                        // Close the form
                        setShowCredentialsForm(false);
                        // Refresh data to load demo data
                        refreshData();
                      }}
                      className={`px-4 py-2 rounded ${
                        theme === 'dark'
                          ? 'bg-slate-700 hover:bg-slate-600 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCredentials}
                      disabled={configTesting}
                      className={`px-4 py-2 rounded ${
                        theme === 'dark'
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      } ${configTesting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {configTesting ? 'Testing...' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
          ) : (
            <>
              {/* Notification banner for errors or status messages, less intrusive */}
              {error && (
                <div className={`mb-5 p-4 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-amber-900/20 border-amber-800/30 text-amber-200' 
                    : 'bg-amber-50 border-amber-100 text-amber-700'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm">{error}</p>
                      </div>
                    </div>
                    
                    {/* Show settings link at the right end of the box */}
                    {(error.includes('credentials') || error.includes('demo data') || error.includes('Using demo data')) && (
                      <Link
                        href="/settings"
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md ${
                          theme === 'dark' 
                            ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        }`}
                      >
                        Go to Settings
                      </Link>
                    )}
                  </div>
                </div>
              )}
              
              {/* Financial dashboard charts - these will use fallback data when needed */}
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
    </div>
  );
}