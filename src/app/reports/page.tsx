'use client';

import { useState, useEffect } from 'react';
import FinancialStats from '@/components/FinancialStats';
import LLMAnalysis from '@/components/LLMAnalysis';
import ChatBox from '@/components/ChatBox';
import Header from '@/components/Header';

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [fetchingDates, setFetchingDates] = useState(true);
  const [selectedInterval, setSelectedInterval] = useState<string>('quarterToDate');
  const [financialData, setFinancialData] = useState<any>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [shouldRefreshAnalysis, setShouldRefreshAnalysis] = useState<boolean>(false);
  
  // Load saved report state on initial render
  useEffect(() => {
    // Check if this is a fresh load of the application
    const isNewSession = !sessionStorage.getItem('reportSessionStarted');
    
    // If this is a new session, clear all previous report data
    if (isNewSession) {
      console.log('New session detected, clearing previous report data');
      localStorage.removeItem('reflashReportState');
      localStorage.removeItem('reflashChatMessages');
      localStorage.removeItem('reflashAnalysisData');
      sessionStorage.setItem('reportSessionStarted', 'true');
      return;
    }
    
    const savedReportState = localStorage.getItem('reflashReportState');
    if (savedReportState) {
      try {
        const state = JSON.parse(savedReportState);
        if (state.selectedDate) {
          setSelectedDate(state.selectedDate);
        }
        if (state.selectedInterval) {
          setSelectedInterval(state.selectedInterval);
        }
        if (state.reportGenerated) {
          setReportGenerated(state.reportGenerated);
        }
      } catch (error) {
        console.error('Error loading saved report state:', error);
        // Clear invalid saved state
        localStorage.removeItem('reflashReportState');
      }
    }
  }, []);
  
  // Save report state to localStorage whenever it changes
  useEffect(() => {
    if (selectedDate || reportGenerated) {
      const stateToSave = {
        selectedDate,
        selectedInterval,
        reportGenerated
      };
      localStorage.setItem('reflashReportState', JSON.stringify(stateToSave));
    }
  }, [selectedDate, selectedInterval, reportGenerated]);
  
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
      setFetchingDates(true);
      setReportGenerated(false);
      // This will re-trigger the fetchDates useEffect
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

  // Fetch available dates from the financial data
  useEffect(() => {
    async function fetchDates() {
      setFetchingDates(true);
      try {
        // Use the dedicated API endpoint for dates
        const response = await fetch('/api/financial/dates');
        const result = await response.json();
        
        if (result.success && result.dates && result.dates.length > 0) {
          // Filter dates based on the selected interval
          const filteredDates = filterDatesByInterval(result.dates, selectedInterval);
          setAvailableDates(filteredDates);
          
          // Only auto-select if we don't already have a selected date from localStorage
          if (filteredDates.length > 0 && !selectedDate) {
            setSelectedDate(filteredDates[0]);
          } else if (filteredDates.length === 0) {
            setSelectedDate('');
          }
        } else {
          // Use dummy dates if no real data is available
          const dummyDates = ['2023-12-31', '2023-09-30', '2023-06-30', '2023-03-31'];
          const filteredDates = filterDatesByInterval(dummyDates, selectedInterval);
          setAvailableDates(filteredDates);
          
          // Only auto-select if we don't already have a selected date from localStorage
          if (filteredDates.length > 0 && !selectedDate) {
            setSelectedDate(filteredDates[0]);
          }
          
          console.log('Using fallback dates, no data returned from API:', result);
        }
      } catch (error) {
        console.error('Error fetching available dates:', error);
        // Fallback to dummy dates
        const dummyDates = ['2023-12-31', '2023-09-30', '2023-06-30', '2023-03-31'];
        const filteredDates = filterDatesByInterval(dummyDates, selectedInterval);
        setAvailableDates(filteredDates);
        
        // Only auto-select if we don't already have a selected date from localStorage
        if (filteredDates.length > 0 && !selectedDate) {
          setSelectedDate(filteredDates[0]);
        }
      } finally {
        setFetchingDates(false);
      }
    }
    
    fetchDates();
  }, [selectedInterval, selectedDate]);
  
  // Filter dates based on the selected interval
  const filterDatesByInterval = (dates: string[], interval: string): string[] => {
    const now = new Date();
    let startDate = new Date();
    
    // Set the start date based on the selected interval
    switch (interval) {
      case 'last30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'quarterToDate':
        // Start of current quarter
        const currentMonth = now.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        break;
      case 'yearToDate':
        startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
        break;
      case 'allDates':
        // Return all dates, no filtering needed
        return [...dates];
      default:
        startDate.setDate(now.getDate() - 30); // Default to last 30 days
    }
    
    // Filter dates within the selected interval
    return dates.filter(date => {
      const dateObj = new Date(date);
      return dateObj >= startDate && dateObj <= now;
    });
  };
  
  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedInterval(e.target.value);
    // Don't reset reportGenerated here to preserve the report view
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate(e.target.value);
    // Only regenerate the report if date changes, but don't hide it
    if (reportGenerated) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
    // Reset the financial data when date changes
    setFinancialData(null);
    // Don't trigger LLM analysis refresh when just changing date
    setShouldRefreshAnalysis(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    
    setIsLoading(true);
    setProcessingError(null);
    
    // Clear previous financial analysis and chat messages when generating a new report
    localStorage.removeItem('reflashAnalysisData');
    localStorage.removeItem('reflashChatMessages');
    
    try {
      // Fetch financial data for the report
      const financialDataResponse = await fetch('/api/financial/data');
      const financialDataResult = await financialDataResponse.json();
      
      if (!financialDataResult.success) {
        throw new Error(financialDataResult.error || 'Failed to fetch financial data');
      }
      
      // Process the data
      const processResponse = await fetch('/api/financial/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          balanceSheets: financialDataResult.data.balanceSheets,
          transactions: financialDataResult.data.transactions,
          targetDate: selectedDate,
          interval: selectedInterval
        }),
      });
      
      const processResult = await processResponse.json();
      
      if (!processResult.success) {
        throw new Error(processResult.error || 'Failed to process financial data');
      }
      
      console.log('Process result from API:', JSON.stringify(processResult).substring(0, 200) + '...');
      
      // Store the processed data to share between components - extract the target sheet directly
      let processedFinancialData = null;
      if (processResult.targetSheet) {
        console.log('Using targetSheet from process result');
        processedFinancialData = processResult.targetSheet;
      } else {
        console.log('Using entire process result as financial data');
        processedFinancialData = processResult;
      }
      
      console.log('Financial data to be used by components:', 
        JSON.stringify(processedFinancialData).substring(0, 200) + '...');
      
      setFinancialData(processedFinancialData);
      setReportGenerated(true);
      
      // Trigger LLM analysis refresh when "Update Report" is clicked
      setShouldRefreshAnalysis(true);
      // Reset it after a delay to allow the effect to trigger
      setTimeout(() => setShouldRefreshAnalysis(false), 100);
      
    } catch (error) {
      console.error('Error preparing financial report:', error);
      setProcessingError(error instanceof Error ? error.message : 'An unknown error occurred');
      // Still set reportGenerated to true to show placeholder content
      setReportGenerated(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Allows clearing the current report
  const handleClearReport = () => {
    setReportGenerated(false);
    setFinancialData(null);
    setProcessingError(null);
    
    // Clear all saved reports data from localStorage
    localStorage.removeItem('reflashReportState');
    localStorage.removeItem('reflashChatMessages');
    localStorage.removeItem('reflashAnalysisData');
    
    console.log('Cleared all report data from localStorage');
  };

  // Format date for display (YYYY-MM-DD to Month DD, YYYY)
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // Card styles for consistent UI
  const cardClasses = `rounded-lg overflow-hidden shadow-sm ${
    theme === 'dark' 
      ? 'bg-slate-800 border border-slate-700' 
      : 'bg-white border border-slate-200'
  }`;

  // Card header styles for consistent UI
  const cardHeaderClasses = `px-4 py-3 ${
    theme === 'dark' 
      ? 'bg-slate-700 text-white' 
      : 'bg-slate-50 text-indigo-900'
  }`;

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Header activePage="reports" />
      
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-indigo-900'}`}>Financial Reports</h2>
              {reportGenerated && (
                <button 
                  onClick={handleClearReport}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  New Report
                </button>
              )}
            </div>
            
            <div className={cardClasses}>
              <div className={cardHeaderClasses}>
                <h3 className="text-lg font-bold">Generate Report</h3>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/3">
                      <label htmlFor="intervalSelect" className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                      }`}>
                        Time Interval
                      </label>
                      <select
                        id="intervalSelect"
                        value={selectedInterval}
                        onChange={handleIntervalChange}
                        className={`w-full px-4 py-2.5 border rounded-md ${
                          theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}
                        disabled={fetchingDates}
                      >
                        <option value="last30days">Last 30 Days</option>
                        <option value="quarterToDate">Quarter to Date</option>
                        <option value="yearToDate">Year to Date</option>
                        <option value="allDates">All Available Dates</option>
                      </select>
                    </div>
                    
                    <div className="w-full md:w-1/3">
                      <label htmlFor="dateSelect" className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                      }`}>
                        Select Report Date
                      </label>
                      <select
                        id="dateSelect"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className={`w-full px-4 py-2.5 border rounded-md ${
                          theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}
                        required
                        disabled={fetchingDates || availableDates.length === 0}
                      >
                        <option value="">Select a date...</option>
                        {fetchingDates ? (
                          <option value="" disabled>Loading dates...</option>
                        ) : availableDates.length > 0 ? (
                          availableDates.map(date => (
                            <option key={date} value={date}>{formatDate(date)}</option>
                          ))
                        ) : (
                          <option value="" disabled>No dates available</option>
                        )}
                      </select>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={!selectedDate || isLoading || fetchingDates}
                      className={`px-6 py-2.5 font-medium rounded-md transition-colors ${
                        theme === 'dark'
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      } ${(!selectedDate || isLoading || fetchingDates) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {reportGenerated ? 'Update Report' : isLoading ? 'Generating...' : fetchingDates ? 'Loading...' : 'Generate Report'}
                    </button>
                  </div>
                  
                  {availableDates.length === 0 && !fetchingDates && (
                    <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-amber-300' : 'text-amber-600'}`}>
                      No financial data dates found for the selected interval. Try a different interval or configure Supabase and create tables in Settings.
                    </p>
                  )}
                  
                  {processingError && (
                    <div className="mt-2 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                      <p className="font-medium">Error processing data:</p>
                      <p>{processingError}</p>
                      <p className="mt-1 text-xs">
                        The report will display with fallback data. Some features may not work correctly.
                      </p>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
          
          {reportGenerated && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Financial Stats Section */}
              <div className={`${cardClasses} md:col-span-1 md:row-span-2`}>
                <div className={cardHeaderClasses}>
                  <h3 className="text-lg font-bold">Financial Statistics</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-200' : 'text-slate-600'}`}>
                    For {selectedDate ? formatDate(selectedDate) : "Selected Period"}
                  </p>
                </div>
                <div className={`p-6 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                  <FinancialStats 
                    data={reportGenerated ? { 
                      date: selectedDate,
                      financialData: financialData
                    } : null} 
                    onDataProcessed={(processedData) => {
                      console.log('Financial data processed:', processedData);
                      if (processedData && !financialData) {
                        // If we have processed data but no financial data, update it
                        setFinancialData(processedData);
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* LLM Analysis Section */}
              <div className={`${cardClasses} md:col-span-2`}>
                <div className={cardHeaderClasses}>
                  <h3 className="text-lg font-bold">AI Financial Analysis</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-200' : 'text-slate-600'}`}>
                    {selectedDate ? formatDate(selectedDate) : "Selected Period"}
                  </p>
                </div>
                <div className={`${theme === 'dark' ? 'p-2' : 'p-6'} ${theme === 'dark' ? 'bg-slate-800' : ''}`}>
                  <LLMAnalysis 
                    targetDate={selectedDate} 
                    interval={selectedInterval} 
                    balanceSheetData={financialData}
                    shouldRefresh={shouldRefreshAnalysis}
                  />
                </div>
              </div>
              
              {/* Chat Section */}
              <div className={`${cardClasses} md:col-span-2`}>
                <div className={cardHeaderClasses}>
                  <h3 className="text-lg font-bold">Ricky - Your Financial Assistant</h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-200' : 'text-slate-600'}`}>
                    Ask questions about your financial data
                  </p>
                </div>
                <div className="p-6">
                  <ChatBox 
                    reportDate={selectedDate} 
                    financialData={financialData} 
                  />
                </div>
              </div>
            </div>
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
