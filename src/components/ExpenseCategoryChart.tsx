'use client';

import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpenseCategoryChartProps {
  expenses: any[];
}

export default function ExpenseCategoryChart({ expenses }: ExpenseCategoryChartProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [categoryData, setCategoryData] = useState<any>(null);
  
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
  
  // Process expenses to get categories
  useEffect(() => {
    if (!expenses || !Array.isArray(expenses)) {
      setCategoryData(createFallbackData());
      return;
    }
    
    try {
      // Create a map of categories to total expenses
      const categoryMap: Record<string, number> = {};
      
      // Process and aggregate expenses by category
      expenses.forEach(expense => {
        // Get the category, defaulting to "Uncategorized" if no category exists
        const category = expense.category || 'Uncategorized';
        
        // Get the expense amount
        const amount = parseFloat(expense.amount) || 0;
        
        // Add to the category total
        if (categoryMap[category]) {
          categoryMap[category] += amount;
        } else {
          categoryMap[category] = amount;
        }
      });
      
      // Generate colors for categories
      const colors = [
        'rgb(255, 99, 132)',
        'rgb(54, 162, 235)',
        'rgb(255, 206, 86)',
        'rgb(75, 192, 192)',
        'rgb(153, 102, 255)',
        'rgb(255, 159, 64)',
        'rgb(255, 99, 255)',
        'rgb(54, 162, 86)',
        'rgb(192, 206, 86)',
        'rgb(75, 102, 192)'
      ];
      
      // Convert to chart.js format
      const labels = Object.keys(categoryMap);
      const data = Object.values(categoryMap);
      
      // Generate background colors (with opacity) and border colors
      const backgroundColors = labels.map((_, i) => colors[i % colors.length].replace('rgb', 'rgba').replace(')', ', 0.6)'));
      const borderColors = labels.map((_, i) => colors[i % colors.length]);
      
      // Create chart data
      const chartData = {
        labels,
        datasets: [
          {
            label: 'Expense Amount',
            data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
          },
        ],
      };
      
      setCategoryData(chartData);
    } catch (error) {
      console.error('Error processing expense categories:', error);
      setCategoryData(createFallbackData());
    }
  }, [expenses]);
  
  // Create fallback data for when expenses are missing
  const createFallbackData = () => {
    return {
      labels: ['Office', 'Salary', 'Marketing', 'Utilities', 'Other'],
      datasets: [
        {
          label: 'Expense Amount',
          data: [1200, 3000, 800, 500, 1500],
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
          ],
          borderColor: [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 206, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: theme === 'dark' ? '#e2e8f0' : '#334155',
          font: {
            family: 'var(--font-geist-sans)',
            size: 12
          },
          boxWidth: 16,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: theme === 'dark' ? '#e2e8f0' : '#334155',
        bodyColor: theme === 'dark' ? '#cbd5e1' : '#475569',
        borderColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        boxPadding: 5,
        bodyFont: {
          family: 'var(--font-geist-sans)'
        },
        titleFont: {
          family: 'var(--font-geist-sans)',
          weight: 'bold' as const
        },
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
          }
        }
      },
      title: {
        display: false
      },
      datalabels: {
        display: false
      }
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }
    }
  };
  
  if (!categoryData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className={`animate-pulse h-4 w-3/4 rounded-full mb-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
        <div className={`animate-pulse h-4 w-2/3 rounded-full mb-6 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex items-center justify-center py-2">
      <div className="h-full w-full">
        <Pie data={categoryData} options={options} />
      </div>
    </div>
  );
} 