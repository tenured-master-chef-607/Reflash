'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { testSupabaseConnection } from '@/utils/testSupabase';
import { createRequiredTables } from '@/utils/createTables';
import { updateEnvFromSettings, notifyEnvironmentChanged } from '@/utils/environmentOverrides';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    supabase: true,
    dataSources: false,
    account: true,
    appearance: true
  });
  const [settings, setSettings] = useState({
    supabaseUrl: '',
    supabaseKey: '',
    quickbooksKey: '',
    xeroKey: '',
    sageKey: '',
    freshbooksKey: '',
    openaiKey: '',
    emailNotifications: true,
    reportFrequency: 'weekly',
    dataSource: 'quickbooks',
    theme: 'light' // Global theme setting
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{success: boolean; message: string} | null>(null);
  const [creatingTables, setCreatingTables] = useState(false);
  const [tableResult, setTableResult] = useState<{success: boolean; message: string; results?: any[]} | null>(null);

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('reflashSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    // Apply theme based on settings
    document.documentElement.classList.toggle('dark-theme', settings.theme === 'dark');
  }, []);
  
  // Update theme when it changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark-theme', settings.theme === 'dark');
  }, [settings.theme]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setSettings({
        ...settings,
        [id]: checkbox.checked
      });
    } else if (type === 'radio') {
      setSettings({
        ...settings,
        theme: value
      });
    } else {
      setSettings({
        ...settings,
        [id]: value
      });
    }
    
    // Clear connection test result when settings change
    setConnectionResult(null);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Supabase URL format
    if (settings.supabaseUrl && !settings.supabaseUrl.startsWith('https://')) {
      alert('Supabase URL must start with https://');
      return;
    }
    
    // Validate Supabase key format (should be long and not empty)
    if (settings.supabaseKey && settings.supabaseKey.length < 20) {
      alert('Supabase key appears to be invalid (too short)');
      return;
    }
    
    // Save settings to localStorage with proper formatting
    if (settings.supabaseUrl) {
      // Ensure URL ends with no trailing slash
      settings.supabaseUrl = settings.supabaseUrl.replace(/\/$/, '');
    }
    
    // Save settings to localStorage
    localStorage.setItem('reflashSettings', JSON.stringify(settings));
    
    // Update environment variable overrides
    updateEnvFromSettings(settings);
    
    // Notify the application that settings have changed
    window.dispatchEvent(new Event('storage'));
    notifyEnvironmentChanged();
    
    setSaved(true);
    
    // Reset the saved status after 3 seconds
    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    
    try {
      // First validate the settings
      if (!settings.supabaseUrl || !settings.supabaseKey) {
        setConnectionResult({
          success: false,
          message: 'Please enter both Supabase URL and API Key'
        });
        return;
      }
      
      if (!settings.supabaseUrl.startsWith('https://')) {
        setConnectionResult({
          success: false,
          message: 'Supabase URL must start with https://'
        });
        return;
      }
      
      // Update environment variable overrides before testing
      if (settings.supabaseUrl && settings.supabaseKey) {
        updateEnvFromSettings(settings);
        notifyEnvironmentChanged();
      }
      
      // Use our test utility
      const result = await testSupabaseConnection(settings.supabaseUrl, settings.supabaseKey);
      
      setConnectionResult(result);
      
      if (result.success) {
        // Save settings to localStorage on successful connection
        localStorage.setItem('reflashSettings', JSON.stringify(settings));
        
        // Create a custom event to notify components that settings have changed
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const createTables = async () => {
    if (!settings.supabaseUrl || !settings.supabaseKey) {
      setTableResult({
        success: false,
        message: 'Please enter both Supabase URL and API Key'
      });
      return;
    }
    
    setCreatingTables(true);
    setTableResult(null);
    
    try {
      // Make sure we're using the latest settings
      updateEnvFromSettings(settings);
      notifyEnvironmentChanged();
      
      const result = await createRequiredTables(settings.supabaseUrl, settings.supabaseKey);
      setTableResult(result);
      
      if (result.success) {
        // Create a custom event to notify components that settings have changed
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      setTableResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setCreatingTables(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${settings.theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Header activePage="settings" />
      
      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className={`text-2xl font-bold mb-6 ${settings.theme === 'dark' ? 'text-white' : 'text-indigo-900'}`}>Settings</h2>
          
          <div className={`rounded-lg shadow-sm border p-6 ${
            settings.theme === 'dark' 
              ? 'bg-slate-800 border-slate-700 text-white' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <form onSubmit={handleSave}>
              {/* Supabase Configuration */}
              <div className="mb-6 border-b pb-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => toggleSection('supabase')}
                  className={`w-full flex items-center justify-between font-medium text-lg ${
                    settings.theme === 'dark' ? 'text-indigo-300' : 'text-indigo-800'
                  }`}
                >
                  <span>Supabase Configuration</span>
                  {expandedSections.supabase ? (
                    <ChevronUpIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                </button>
                
                {expandedSections.supabase && (
                  <div className="mt-4 space-y-4">
                    <div className="mb-4">
                      <label htmlFor="supabaseUrl" className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Supabase URL
                      </label>
                      <input
                        type="text"
                        id="supabaseUrl"
                        value={settings.supabaseUrl}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          settings.theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                        placeholder="https://your-project.supabase.co"
                      />
                      <p className={`mt-1 text-xs ${
                        settings.theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>Example: https://abcdefg.supabase.co</p>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="supabaseKey" className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Supabase API Key
                      </label>
                      <input
                        type="password"
                        id="supabaseKey"
                        value={settings.supabaseKey}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          settings.theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                        placeholder="your-supabase-api-key"
                      />
                      <p className={`mt-1 text-xs ${
                        settings.theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>Use the <code>anon</code> public key from your Supabase project settings.</p>
                    </div>

                    <div className="mt-5 mb-5">
                      <button
                        type="button"
                        onClick={testConnection}
                        disabled={testingConnection || !settings.supabaseUrl || !settings.supabaseKey}
                        className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
                          settings.theme === 'dark'
                            ? 'bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800'
                            : 'bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300'
                        } disabled:cursor-not-allowed transition-colors`}
                      >
                        {testingConnection ? 'Testing...' : 'Test Connection'}
                      </button>
                      
                      {connectionResult && (
                        <div className={`mt-3 p-3 rounded-md ${
                          connectionResult.success
                            ? (settings.theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800')
                            : (settings.theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800')
                        }`}>
                          {connectionResult.message}
                        </div>
                      )}
                      
                      {connectionResult && connectionResult.success && (
                        <div className="mt-5">
                          <p className={`mb-2 text-sm ${settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            You can initialize the required database tables with sample data:
                          </p>
                          <button
                            type="button"
                            onClick={createTables}
                            disabled={creatingTables}
                            className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
                              settings.theme === 'dark'
                                ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800'
                                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
                            } disabled:cursor-not-allowed transition-colors`}
                          >
                            {creatingTables ? 'Creating Tables...' : 'Create Required Tables'}
                          </button>
                          
                          {tableResult && (
                            <div className={`mt-3 p-3 rounded-md ${
                              tableResult.success
                                ? (settings.theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800')
                                : (settings.theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800')
                            }`}>
                              <p className="font-medium">{tableResult.message}</p>
                              {tableResult.results && (
                                <ul className="mt-2 text-xs">
                                  {tableResult.results.map((result, index) => (
                                    <li key={index} className="flex items-center">
                                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                        result.success 
                                          ? (settings.theme === 'dark' ? 'bg-green-400' : 'bg-green-500') 
                                          : (settings.theme === 'dark' ? 'bg-red-400' : 'bg-red-500')
                                      }`}></span>
                                      <span className="font-mono">{result.table}</span>
                                      <span className="mx-2">-</span>
                                      <span>{result.message}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Data Sources API Keys */}
              <div className="mb-6 border-b pb-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => toggleSection('dataSources')}
                  className={`w-full flex items-center justify-between font-medium text-lg ${
                    settings.theme === 'dark' ? 'text-indigo-300' : 'text-indigo-800'
                  }`}
                >
                  <span>Data Sources API Keys</span>
                  {expandedSections.dataSources ? (
                    <ChevronUpIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                </button>
                
                {expandedSections.dataSources && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="quickbooksKey" className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        QuickBooks API Key
                      </label>
                      <input
                        type="password"
                        id="quickbooksKey"
                        value={settings.quickbooksKey}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          settings.theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                        placeholder="your-quickbooks-api-key"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="xeroKey" className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Xero API Key
                      </label>
                      <input
                        type="password"
                        id="xeroKey"
                        value={settings.xeroKey}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          settings.theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                        placeholder="your-xero-api-key"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="sageKey" className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Sage API Key
                      </label>
                      <input
                        type="password"
                        id="sageKey"
                        value={settings.sageKey}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          settings.theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                        placeholder="your-sage-api-key"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="freshbooksKey" className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        FreshBooks API Key
                      </label>
                      <input
                        type="password"
                        id="freshbooksKey"
                        value={settings.freshbooksKey}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          settings.theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                        placeholder="your-freshbooks-api-key"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="openaiKey" className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        OpenAI API Key (for AI Analysis)
                      </label>
                      <input
                        type="password"
                        id="openaiKey"
                        value={settings.openaiKey}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          settings.theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                        placeholder="your-openai-api-key"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Account Settings */}
              <div className="mb-6 border-b pb-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => toggleSection('account')}
                  className={`w-full flex items-center justify-between font-medium text-lg ${
                    settings.theme === 'dark' ? 'text-indigo-300' : 'text-indigo-800'
                  }`}
                >
                  <span>Account Settings</span>
                  {expandedSections.account ? (
                    <ChevronUpIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                </button>
                
                {expandedSections.account && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Email Notifications
                      </label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailNotifications"
                          checked={settings.emailNotifications}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="emailNotifications" className={`ml-2 text-sm ${
                          settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          Receive financial report notifications
                        </label>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reportFrequency" className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Report Frequency
                      </label>
                      <select
                        id="reportFrequency"
                        value={settings.reportFrequency}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          settings.theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="dataSource" className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Default Data Source
                      </label>
                      <select
                        id="dataSource"
                        value={settings.dataSource}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          settings.theme === 'dark' 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="quickbooks">QuickBooks</option>
                        <option value="xero">Xero</option>
                        <option value="sage">Sage</option>
                        <option value="freshbooks">FreshBooks</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Appearance Settings */}
              <div className="mb-6 border-b pb-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => toggleSection('appearance')}
                  className={`w-full flex items-center justify-between font-medium text-lg ${
                    settings.theme === 'dark' ? 'text-indigo-300' : 'text-indigo-800'
                  }`}
                >
                  <span>Appearance Settings</span>
                  {expandedSections.appearance ? (
                    <ChevronUpIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                </button>
                
                {expandedSections.appearance && (
                  <div className="mt-4">
                    <label className={`block text-sm font-medium mb-3 ${
                      settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Theme Preference
                    </label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          settings.theme === 'light' 
                            ? 'ring-2 ring-indigo-500 border-indigo-400' 
                            : 'border-slate-300 hover:border-indigo-300'
                        }`}
                        onClick={() => setSettings({...settings, theme: 'light'})}
                      >
                        <div className="flex items-center mb-3">
                          <input
                            type="radio"
                            id="lightTheme"
                            name="theme"
                            value="light"
                            checked={settings.theme === 'light'}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                          />
                          <label htmlFor="lightTheme" className="ml-2 text-sm font-medium text-slate-700">
                            Light Theme
                          </label>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-md p-2 shadow-sm">
                          <div className="h-6 bg-indigo-600 rounded-md mb-2"></div>
                          <div className="flex space-x-1 mb-2">
                            <div className="h-2 bg-slate-200 rounded flex-1"></div>
                            <div className="h-2 bg-slate-200 rounded flex-1"></div>
                          </div>
                          <div className="h-8 bg-slate-100 rounded-md"></div>
                        </div>
                      </div>
                      
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          settings.theme === 'dark' 
                            ? 'ring-2 ring-indigo-500 border-indigo-400' 
                            : 'border-slate-300 hover:border-indigo-300'
                        }`}
                        onClick={() => setSettings({...settings, theme: 'dark'})}
                      >
                        <div className="flex items-center mb-3">
                          <input
                            type="radio"
                            id="darkTheme"
                            name="theme"
                            value="dark"
                            checked={settings.theme === 'dark'}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                          />
                          <label htmlFor="darkTheme" className="ml-2 text-sm font-medium text-slate-700">
                            Dark Theme
                          </label>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-md p-2 shadow-sm">
                          <div className="h-6 bg-indigo-500 rounded-md mb-2"></div>
                          <div className="flex space-x-1 mb-2">
                            <div className="h-2 bg-slate-600 rounded flex-1"></div>
                            <div className="h-2 bg-slate-600 rounded flex-1"></div>
                          </div>
                          <div className="h-8 bg-slate-700 rounded-md"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className={`px-4 py-2 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    settings.theme === 'dark'
                      ? 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-400'
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                  }`}
                >
                  Save Settings
                </button>
              </div>
              
              {saved && (
                <div className={`mt-4 p-3 rounded-md ${
                  settings.theme === 'dark'
                    ? 'bg-green-900 text-green-300'
                    : 'bg-green-100 text-green-700'
                }`}>
                  Settings saved successfully!
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
      
      <footer className={`py-4 text-center text-xs border-t ${
        settings.theme === 'dark'
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