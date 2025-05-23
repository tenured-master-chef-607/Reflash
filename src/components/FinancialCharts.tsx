'use client';

import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface FinancialChartsProps {
  data: {
    date: string;
    interval?: string;
    chartType?: 'majorFinancials' | 'currentRatio' | 'debtToEquityRatio' | 'returnOnEquity' | 'equityMultiplier' | 'debtRatio' | 'netProfitMargin' | 'revenue' | 'expense' | 'profit';
  } | null;
}

export default function FinancialCharts({ data }: FinancialChartsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [activeChart, setActiveChart] = useState('majorFinancials');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Load theme from localStorage
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

  useEffect(() => {
    // Set the initial active chart based on chartType prop if provided
    if (data?.chartType) {
      switch (data.chartType) {
        case 'majorFinancials':
          setActiveChart('majorFinancials');
          break;
        case 'currentRatio':
          setActiveChart('currentRatio');
          break;
        case 'debtToEquityRatio':
          setActiveChart('debtToEquityRatio');
          break;
        case 'returnOnEquity':
          setActiveChart('returnOnEquity');
          break;
        case 'equityMultiplier':
          setActiveChart('equityMultiplier');
          break;
        case 'debtRatio':
          setActiveChart('debtRatio');
          break;
        case 'netProfitMargin':
          setActiveChart('netProfitMargin');
          break;
        default:
          setActiveChart('majorFinancials');
      }
    }
  }, [data?.chartType]);
  
  // Define createFallbackChartData function here, before it's used
  function createFallbackChartData() {
    const emptyDates = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const emptyData = [0, 0, 0, 0, 0, 0];
    
    return {
      majorFinancials: {
        labels: emptyDates,
        datasets: [
          {
            label: 'Total Assets',
            data: emptyData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
          },
          {
            label: 'Total Liabilities',
            data: emptyData,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.5)',
          },
          {
            label: 'Total Equity',
            data: emptyData,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
          },
          {
            label: 'Net Income',
            data: emptyData,
            borderColor: 'rgb(139, 92, 246)',
            backgroundColor: 'rgba(139, 92, 246, 0.5)',
          }
        ]
      },
      revenue: {
        labels: emptyDates,
        datasets: [
          {
            label: 'Revenue',
            data: emptyData,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            fill: true,
            tension: 0.1
          }
        ]
      },
      expense: {
        labels: emptyDates,
        datasets: [
          {
            label: 'Expenses',
            data: emptyData,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            fill: true,
            tension: 0.1
          }
        ]
      },
      profit: {
        labels: emptyDates,
        datasets: [
          {
            label: 'Profit',
            data: emptyData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            fill: true,
            tension: 0.1
          }
        ]
      },
      ratios: {
        currentRatio: {
          labels: emptyDates,
          datasets: [
            {
              label: 'Current Ratio',
              data: emptyData,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              tension: 0.1,
              fill: true
            }
          ]
        },
        debtToEquityRatio: {
          labels: emptyDates,
          datasets: [
            {
              label: 'Debt to Equity Ratio',
              data: emptyData,
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              tension: 0.1,
              fill: true
            }
          ]
        },
        returnOnEquity: {
          labels: emptyDates,
          datasets: [
            {
              label: 'Return on Equity',
              data: emptyData,
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              tension: 0.1,
              fill: true
            }
          ]
        },
        equityMultiplier: {
          labels: emptyDates,
          datasets: [
            {
              label: 'Equity Multiplier',
              data: emptyData,
              borderColor: 'rgb(139, 92, 246)',
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              tension: 0.1,
              fill: true
            }
          ]
        },
        debtRatio: {
          labels: emptyDates,
          datasets: [
            {
              label: 'Debt Ratio',
              data: emptyData,
              borderColor: 'rgb(245, 158, 11)',
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              tension: 0.1,
              fill: true
            }
          ]
        },
        netProfitMargin: {
          labels: emptyDates,
          datasets: [
            {
              label: 'Net Profit Margin',
              data: emptyData,
              borderColor: 'rgb(6, 182, 212)',
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
              tension: 0.1,
              fill: true
            }
          ]
        }
      }
    };
  }
  
  // Define ChartSelector component
  const ChartSelector = () => {
    return (
      <div className={`mb-4 flex flex-wrap gap-2 justify-center`}>
        <button
          onClick={() => setActiveChart('majorFinancials')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            activeChart === 'majorFinancials'
              ? theme === 'dark' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-indigo-600 text-white'
              : theme === 'dark'
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Major Financials
        </button>
        <button
          onClick={() => setActiveChart('currentRatio')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            activeChart === 'currentRatio'
              ? theme === 'dark' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-600 text-white'
              : theme === 'dark'
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Current Ratio
        </button>
        <button
          onClick={() => setActiveChart('debtToEquityRatio')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            activeChart === 'debtToEquityRatio'
              ? theme === 'dark' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-600 text-white'
              : theme === 'dark'
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Debt to Equity
        </button>
        <button
          onClick={() => setActiveChart('returnOnEquity')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            activeChart === 'returnOnEquity'
              ? theme === 'dark' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-600 text-white'
              : theme === 'dark'
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Return on Equity
        </button>
        <button
          onClick={() => setActiveChart('equityMultiplier')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            activeChart === 'equityMultiplier'
              ? theme === 'dark' 
                ? 'bg-purple-600 text-white' 
                : 'bg-purple-600 text-white'
              : theme === 'dark'
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Equity Multiplier
        </button>
        <button
          onClick={() => setActiveChart('debtRatio')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            activeChart === 'debtRatio'
              ? theme === 'dark' 
                ? 'bg-amber-600 text-white' 
                : 'bg-amber-600 text-white'
              : theme === 'dark'
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Debt Ratio
        </button>
        <button
          onClick={() => setActiveChart('netProfitMargin')}
          className={`px-3 py-1.5 text-sm rounded-md ${
            activeChart === 'netProfitMargin'
              ? theme === 'dark' 
                ? 'bg-cyan-600 text-white' 
                : 'bg-cyan-600 text-white'
              : theme === 'dark'
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Net Profit Margin
        </button>
      </div>
    );
  };
  
  // Define getChartData function here
  const getChartData = () => {
    if (selectedChartData) {
      return selectedChartData;
    }
    
    // Create fallback chart data if the specific chart requested isn't available
    if (data?.chartType && chartData) {
      // Handle missing chart data by providing a default format
      switch (data.chartType) {
        case 'currentRatio': 
          return chartData.ratios?.currentRatio || {
            labels: [],
            datasets: [{
              label: 'Current Ratio',
              data: [],
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
            }]
          };
        case 'debtToEquityRatio':
          return chartData.ratios?.debtToEquityRatio || {
            labels: [],
            datasets: [{
              label: 'Debt to Equity Ratio',
              data: [],
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.5)',
            }]
          };
        case 'returnOnEquity':
          return chartData.ratios?.returnOnEquity || {
            labels: [],
            datasets: [{
              label: 'Return on Equity',
              data: [],
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.5)',
            }]
          };
        case 'equityMultiplier':
          return chartData.ratios?.equityMultiplier || {
            labels: [],
            datasets: [{
              label: 'Equity Multiplier',
              data: [],
              borderColor: 'rgb(139, 92, 246)',
              backgroundColor: 'rgba(139, 92, 246, 0.5)',
            }]
          };
        case 'debtRatio':
          return chartData.ratios?.debtRatio || {
            labels: [],
            datasets: [{
              label: 'Debt Ratio',
              data: [],
              borderColor: 'rgb(245, 158, 11)',
              backgroundColor: 'rgba(245, 158, 11, 0.5)',
            }]
          };
        case 'netProfitMargin':
          return chartData.ratios?.netProfitMargin || {
            labels: [],
            datasets: [{
              label: 'Net Profit Margin',
              data: [],
              borderColor: 'rgb(6, 182, 212)',
              backgroundColor: 'rgba(6, 182, 212, 0.5)',
            }]
          };
        case 'revenue': 
          return chartData.revenue || {
            labels: chartData.majorFinancials?.labels || [],
            datasets: [{
              label: 'Revenue',
              data: chartData.majorFinancials?.datasets?.[0]?.data || [],
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              fill: true,
              tension: 0.1
            }]
          };
        case 'expense':
          return chartData.expense || {
            labels: chartData.majorFinancials?.labels || [],
            datasets: [{
              label: 'Expenses',
              data: chartData.majorFinancials?.datasets?.[1]?.data || [],
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              fill: true,
              tension: 0.1
            }]
          };
        case 'profit':
          return chartData.profit || {
            labels: chartData.majorFinancials?.labels || [],
            datasets: [{
              label: 'Profit',
              data: chartData.majorFinancials?.datasets?.[2]?.data || [],
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              fill: true,
              tension: 0.1
            }]
          };
        default:
          return {
            labels: [],
            datasets: [{
              label: 'No Data',
              data: [],
              borderColor: 'rgb(100, 116, 139)',
              backgroundColor: 'rgba(100, 116, 139, 0.5)',
            }]
          };
      }
    }
    
    return {
      labels: [],
      datasets: [{
        label: 'No Data',
        data: [],
        borderColor: 'rgb(100, 116, 139)',
        backgroundColor: 'rgba(100, 116, 139, 0.5)',
      }]
    };
  };

  useEffect(() => {
    async function fetchChartData() {
      if (!data?.date) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the financial data first
        const finDataRes = await fetch('/api/financial/data');
        const finData = await finDataRes.json();
        
        if (!finData.success) {
          console.warn('Failed to fetch financial data, using fallback data:', finData.error);
          setChartData(createFallbackChartData());
          return;
        }
        
        // Ensure we have valid data structures, even if empty
        const balanceSheets = Array.isArray(finData.data.balanceSheets) 
          ? finData.data.balanceSheets 
          : [];
        
        const transactions = Array.isArray(finData.data.transactions) 
          ? finData.data.transactions 
          : [];
        
        // Process the data with the selected date and interval
        const processRes = await fetch('/api/financial/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            balanceSheets,
            transactions,
            targetDate: data.date,
            interval: data.interval || 'quarterToDate' // Include interval in the request
          }),
        });
        
        const processData = await processRes.json();
        
        if (!processData.success) {
          console.warn('Failed to process financial data, using fallback data:', processData.error);
          setChartData(createFallbackChartData());
          return;
        }
        
        setChartData(processData.chartData);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        // Set fallback chart data so UI doesn't break
        setChartData(createFallbackChartData());
      } finally {
        setLoading(false);
      }
    }
    
    fetchChartData();
  }, [data]);
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme === 'dark' ? '#e2e8f0' : '#334155',
          font: {
            family: 'var(--font-geist-sans)',
            weight: 'normal' as const
          },
          usePointStyle: true,
          pointStyle: 'circle'
        },
        display: !data?.chartType // Hide legend for small charts
      },
      title: {
        display: !data?.chartType, // Only show title for the main chart, not the small ones
        text: activeChart === 'majorFinancials' 
          ? 'Major Financial Metrics' 
          : activeChart.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        color: theme === 'dark' ? '#e2e8f0' : '#334155',
        font: {
          size: 16,
          family: 'var(--font-geist-sans)',
          weight: 'bold' as const
        },
        padding: {
          bottom: 15
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        padding: data?.chartType ? 6 : 10,
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: theme === 'dark' ? '#e2e8f0' : '#334155',
        bodyColor: theme === 'dark' ? '#cbd5e1' : '#475569',
        borderColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
        borderWidth: 1,
        bodyFont: {
          family: 'var(--font-geist-sans)'
        },
        titleFont: {
          family: 'var(--font-geist-sans)',
          weight: 'bold' as const
        },
        cornerRadius: 8,
        boxPadding: 5
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: any) => {
            if (activeChart === 'majorFinancials') {
              return '$' + value.toLocaleString();
            }
            return value.toFixed(2);
          },
          color: theme === 'dark' ? '#cbd5e1' : '#64748b',
          display: !data?.chartType || window.innerWidth > 768, // Hide y-axis ticks on small charts on mobile
          padding: data?.chartType ? 0 : 8,
          font: {
            size: data?.chartType ? 10 : 12,
            family: 'var(--font-geist-sans)'
          }
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)',
          display: !data?.chartType, // Hide grid lines on small charts
          z: -1
        },
        border: {
          display: false
        }
      },
      x: {
        ticks: {
          color: theme === 'dark' ? '#cbd5e1' : '#64748b',
          maxRotation: data?.chartType ? 0 : 45, // Don't rotate labels on small charts
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: data?.chartType ? 5 : 10, // Fewer ticks on small charts
          padding: data?.chartType ? 0 : 8,
          font: {
            size: data?.chartType ? 10 : 12,
            family: 'var(--font-geist-sans)'
          }
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)',
          display: !data?.chartType, // Hide grid lines on small charts
          z: -1
        },
        border: {
          display: false
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: data?.chartType ? 2 : 3
      },
      point: {
        radius: data?.chartType ? 2 : 3,
        hoverRadius: data?.chartType ? 3 : 5,
        borderWidth: 2
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className={`animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-indigo-100'} h-8 w-3/4 rounded`}></div>
        <div className={`animate-pulse ${theme === 'dark' ? 'bg-slate-700' : 'bg-indigo-100'} h-64 rounded`}></div>
      </div>
    );
  }
  
  if (error) {
    // Instead of showing an error, show placeholder chart
    // This ensures we always display something visually useful
    return (
      <div>
        {!data?.chartType && <ChartSelector />}
        <div className={`${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white/95 border-indigo-100'} rounded-xl border shadow-lg backdrop-blur-sm ${data?.chartType ? 'p-2' : 'p-5'}`}>
          <div style={{ height: data?.chartType ? '270px' : '400px' }} className="p-2">
            <Line options={chartOptions} data={getChartData()} />
          </div>
          <p className={`text-xs italic text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Using placeholder data. Connect to your database to see real financial metrics.
          </p>
        </div>
      </div>
    );
  }
  
  if (!chartData) {
    return (
      <div className={`rounded-xl border shadow-lg backdrop-blur-sm ${data?.chartType ? 'p-2' : 'p-5'} ${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white/95 border-indigo-100'}`}>
        <div className="flex flex-col items-center justify-center" style={{ height: data?.chartType ? '270px' : '400px' }}>
          <div className={`animate-pulse h-4 w-3/4 rounded-full mb-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <div className={`animate-pulse h-4 w-2/3 rounded-full mb-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <svg className={`w-16 h-16 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
          </svg>
        </div>
      </div>
    );
  }
  
  // Create the chart data
  const selectedChartData = activeChart === 'majorFinancials' 
    ? chartData.majorFinancials 
    : activeChart === 'revenue'
      ? chartData.revenue
      : activeChart === 'expense'
        ? chartData.expense
        : activeChart === 'profit'
          ? chartData.profit
          : chartData.ratios && chartData.ratios[activeChart] 
            ? chartData.ratios[activeChart] 
            : null;
  
  return (
    <div>
      {!data?.chartType && <ChartSelector />}
      <div className={`${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white/95 border-indigo-100'} rounded-xl border shadow-lg backdrop-blur-sm ${data?.chartType ? 'p-2' : 'p-5'}`}>
        <div style={{ height: data?.chartType ? '270px' : '400px' }} className="p-2">
          <Line options={chartOptions} data={getChartData()} />
        </div>
      </div>
    </div>
  );
} 