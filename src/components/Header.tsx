'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

type HeaderProps = {
  activePage: 'dashboard' | 'reports' | 'settings';
};

export default function Header({ activePage }: HeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    // Load theme from localStorage on component mount
    const savedSettings = localStorage.getItem('reflashSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setTheme(settings.theme || 'light');
    }
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    // Update localStorage settings
    const savedSettings = localStorage.getItem('reflashSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      settings.theme = newTheme;
      localStorage.setItem('reflashSettings', JSON.stringify(settings));
    } else {
      // Create new settings if not exists
      localStorage.setItem('reflashSettings', JSON.stringify({ theme: newTheme }));
    }
    
    // Apply theme
    document.documentElement.classList.toggle('dark-theme', newTheme === 'dark');
    setTheme(newTheme);
    
    // Dispatch custom event for other components to detect the change
    window.dispatchEvent(new Event('themeChange'));
  };

  // Apply header styling based on theme
  const headerStyle = theme === 'dark' 
    ? 'bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-700' 
    : 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-500';

  return (
    <header className={`py-5 px-6 text-white shadow-xl ${headerStyle}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white bg-opacity-20 p-2 rounded-lg shadow-inner backdrop-blur-sm">
            <span className="text-white text-xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Reflash <span className="font-light">Financial</span>
          </h1>
        </div>
        
        <div className="flex items-center">
          {/* Desktop navigation */}
          <nav className="hidden md:flex space-x-8 mr-6">
            <Link 
              href="/dashboard" 
              className={`${
                activePage === 'dashboard' 
                  ? 'text-white border-b-2 border-white pb-1 font-semibold' 
                  : 'text-indigo-100 hover:text-white transition-colors'
              } font-medium text-base hover:scale-105 transition-transform`}
              title="Financial data dashboard with charts and visualizations"
            >
              Dashboard
            </Link>
            <Link 
              href="/reports" 
              className={`${
                activePage === 'reports' 
                  ? 'text-white border-b-2 border-white pb-1 font-semibold' 
                  : 'text-indigo-100 hover:text-white transition-colors'
              } font-medium text-base hover:scale-105 transition-transform`}
              title="Financial reports with AI analysis and chat assistant"
            >
              Reports
            </Link>
            <Link 
              href="/settings" 
              className={`${
                activePage === 'settings' 
                  ? 'text-white border-b-2 border-white pb-1 font-semibold' 
                  : 'text-indigo-100 hover:text-white transition-colors'
              } font-medium text-base hover:scale-105 transition-transform`}
            >
              Settings
            </Link>
          </nav>
          
          {/* Mobile menu button */}
          <button
            className="md:hidden mr-3 p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 transition-all duration-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6 text-white" />
            ) : (
              <Bars3Icon className="h-6 w-6 text-white" />
            )}
          </button>
          
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 transition-all duration-300 shadow-md backdrop-blur-sm"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <MoonIcon className="h-5 w-5 text-white" />
            ) : (
              <SunIcon className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile navigation menu */}
      <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'} pt-4 pb-2 mt-3 border-t border-indigo-400 border-opacity-30`}>
        <nav className="flex flex-col space-y-3">
          <Link 
            href="/dashboard" 
            className={`${
              activePage === 'dashboard' 
                ? 'bg-white bg-opacity-20 rounded-md font-semibold' 
                : 'text-indigo-100 hover:bg-white hover:bg-opacity-10 rounded-md'
            } py-2 px-3 text-base transition-all`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            href="/reports" 
            className={`${
              activePage === 'reports' 
                ? 'bg-white bg-opacity-20 rounded-md font-semibold' 
                : 'text-indigo-100 hover:bg-white hover:bg-opacity-10 rounded-md'
            } py-2 px-3 text-base transition-all`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Reports
          </Link>
          <Link 
            href="/settings" 
            className={`${
              activePage === 'settings' 
                ? 'bg-white bg-opacity-20 rounded-md font-semibold' 
                : 'text-indigo-100 hover:bg-white hover:bg-opacity-10 rounded-md'
            } py-2 px-3 text-base transition-all`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
} 