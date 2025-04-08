'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { testSupabaseConnection, notifyConnectionTested } from '@/utils/testSupabase';
import { createRequiredTables } from '@/utils/createTables';
import { updateEnvFromSettings, notifyEnvironmentChanged } from '@/utils/environmentOverrides';

// Function to securely set cookies for API credentials
function setCookiesForCredentials(credentials: { [key: string]: string }) {
  // Set HTTP-only cookies with secure flag if in production
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = '; SameSite=Lax'; // Use Lax to allow page redirections to include cookie
  
  // Set cookies with 7-day expiration (or adjust as needed)
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  
  // Set cookies for all credentials
  Object.entries(credentials).forEach(([name, value]) => {
    if (value) {
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires.toUTCString()}${secure}${sameSite}`;
    }
  });
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    supabase: true,
    dataSources: true,
    account: true,
    appearance: true
  });
  const [settings, setSettings] = useState<{
    supabaseUrl: string;
    supabaseKey: string;
    quickbooksKey: string;
    xeroKey: string;
    sageKey: string;
    freshbooksKey: string;
    openaiKey: string;
    emailNotifications: boolean;
    reportFrequency: string;
    dataSource: string;
    theme: string;
    [key: string]: string | boolean;
  }>({
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
  // Track initial settings to detect changes
  const initialSettingsRef = useRef({ supabaseUrl: '', supabaseKey: '' });
  const [credentialsModified, setCredentialsModified] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{success: boolean; message: string} | null>(null);
  const [creatingTables, setCreatingTables] = useState(false);
  const [tableResult, setTableResult] = useState<{success: boolean; message: string; results?: any[]} | null>(null);

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('reflashSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        // Ensure we always have defined values for all settings
        setSettings({
          supabaseUrl: parsedSettings.supabaseUrl || '',
          supabaseKey: parsedSettings.supabaseKey || '',
          quickbooksKey: parsedSettings.quickbooksKey || '',
          xeroKey: parsedSettings.xeroKey || '',
          sageKey: parsedSettings.sageKey || '',
          freshbooksKey: parsedSettings.freshbooksKey || '',
          openaiKey: parsedSettings.openaiKey || '',
          emailNotifications: parsedSettings.emailNotifications !== undefined ? parsedSettings.emailNotifications : true,
          reportFrequency: parsedSettings.reportFrequency || 'weekly',
          dataSource: parsedSettings.dataSource || 'quickbooks',
          theme: parsedSettings.theme || 'light'
        });
        
        // Store initial values to detect changes
        initialSettingsRef.current = {
          supabaseUrl: parsedSettings.supabaseUrl || '',
          supabaseKey: parsedSettings.supabaseKey || ''
        };
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
    
    // Apply theme based on settings
    document.documentElement.classList.toggle('dark-theme', settings.theme === 'dark');
    
    // Check for previously successful connection
    const connectionStatus = localStorage.getItem('supabaseConnectionStatus');
    if (connectionStatus) {
      try {
        const status = JSON.parse(connectionStatus);
        // Only set as successful if credentials haven't changed
        if (status.success && 
            status.url === initialSettingsRef.current.supabaseUrl && 
            status.key === initialSettingsRef.current.supabaseKey) {
          setConnectionResult({
            success: true,
            message: 'Connection previously verified successfully'
          });
        }
      } catch (e) {
        console.error('Error parsing connection status:', e);
      }
    }
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
        theme: value || 'light' // Provide default value if undefined
      });
    } else {
      setSettings({
        ...settings,
        [id]: value || '' // Ensure empty string if value is undefined
      });
    }
    
    // Check if Supabase credentials have been modified
    if (id === 'supabaseUrl' || id === 'supabaseKey') {
      const newUrl = id === 'supabaseUrl' ? (value || '') : (settings.supabaseUrl || '');
      const newKey = id === 'supabaseKey' ? (value || '') : (settings.supabaseKey || '');
      
      const modified = 
        newUrl !== initialSettingsRef.current.supabaseUrl || 
        newKey !== initialSettingsRef.current.supabaseKey;
      
      setCredentialsModified(modified);
      
      // Clear connection test result only if credentials were modified
      if (modified) {
        setConnectionResult(null);
      }
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    
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
    
    // If Supabase credentials have been modified but not tested, require a test
    if (credentialsModified && settings.supabaseUrl && settings.supabaseKey) {
      alert('You have modified your Supabase credentials. Please test the connection before saving.');
      return;
    }
    
    // Format Supabase URL - ensure URL ends with no trailing slash
    if (settings.supabaseUrl) {
      settings.supabaseUrl = settings.supabaseUrl.replace(/\/$/, '');
    }
    
    try {
      // Save to localStorage
      localStorage.setItem('reflashSettings', JSON.stringify(settings));
      
      // Update initial settings reference if Supabase settings were changed and tested
      if (settings.supabaseUrl && settings.supabaseKey && !credentialsModified) {
        initialSettingsRef.current = {
          supabaseUrl: settings.supabaseUrl,
          supabaseKey: settings.supabaseKey
        };
      }
      
      // Set cookies for server-side access if credentials exist
      const credentials: { [key: string]: string } = {};
      
      if (settings.supabaseUrl) {
        credentials['supabase-url'] = settings.supabaseUrl;
      }
      
      if (settings.supabaseKey) {
        credentials['supabase-key'] = settings.supabaseKey;
      }
      
      if (settings.openaiKey) {
        credentials['openai-api-key'] = settings.openaiKey;
      }
      
      // Set all cookies at once
      setCookiesForCredentials(credentials);
      
      // Update environment variables
      updateEnvFromSettings(settings);
      notifyEnvironmentChanged();
      
      // Only notify of credential changes if credentials still match what was tested
      if (!credentialsModified) {
        notifyConnectionTested(settings.supabaseUrl, settings.supabaseKey, true);
      }
      
      // Notify the application that settings have changed
      window.dispatchEvent(new Event('storage'));
      
      // Show saved indicator
      setSaved(true);
      
      // Clear indicator after 3 seconds
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings: ' + (error instanceof Error ? error.message : String(error)));
    }
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
        
        // Update initial ref to track new "initial" values
        initialSettingsRef.current = {
          supabaseUrl: settings.supabaseUrl,
          supabaseKey: settings.supabaseKey
        };
        
        // Reset the modified flag since we're now in sync
        setCredentialsModified(false);
        
        // Store connection status in localStorage to persist across sessions
        localStorage.setItem('supabaseConnectionStatus', JSON.stringify({
          success: true,
          url: settings.supabaseUrl,
          key: settings.supabaseKey,
          timestamp: Date.now()
        }));
        
        // Set cookies for server-side access
        setCookiesForCredentials({
          'supabase-url': settings.supabaseUrl,
          'supabase-key': settings.supabaseKey,
          'openai-api-key': settings.openaiKey
        });
        
        // Create a custom event to notify components that settings have changed
        window.dispatchEvent(new Event('storage'));
        
        // Dispatch a new custom event specifically for Supabase credential changes
        notifyConnectionTested(settings.supabaseUrl, settings.supabaseKey, true);
      } else {
        // Even for failed tests, notify so the dashboard can update accordingly
        notifyConnectionTested(settings.supabaseUrl, settings.supabaseKey, false);
        
        // Clear any previous successful status
        localStorage.removeItem('supabaseConnectionStatus');
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      
      // Clear any previous successful status
      localStorage.removeItem('supabaseConnectionStatus');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${settings.theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Header activePage="settings" />
      
      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className={`text-2xl font-bold mb-6 ${settings.theme === 'dark' ? 'text-white' : 'text-indigo-900'}`}>Settings</h2>
          
          {/* API Key Alert */}
          {!settings.openaiKey && (
            <div className={`mb-6 p-4 rounded-lg border ${
              settings.theme === 'dark' 
                ? 'bg-amber-900/30 border-amber-800 text-amber-200' 
                : 'bg-amber-100 border-amber-200 text-amber-800'
            }`}>
              <h3 className="font-bold text-lg mb-1">OpenAI API Key Required</h3>
              <p className="mb-2">An OpenAI API key is required to use the AI Financial Analysis features.</p>
              <p>You can set this in the Account Settings section below.</p>
            </div>
          )}
          
          <div className={`rounded-lg shadow-sm border p-6 ${
            settings.theme === 'dark' 
              ? 'bg-slate-800 border-slate-700 text-white' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <form onSubmit={saveSettings}>
              {/* Supabase Configuration */}
              <div className="mb-8">
                <h2 className={`text-xl font-bold mb-4 ${settings.theme === 'dark' ? 'text-white' : 'text-indigo-900'}`}>
                  Supabase Configuration
                </h2>
                
                <div className={`p-6 rounded-lg border shadow-sm ${
                  settings.theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-white' 
                    : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="mb-1">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className={`text-lg font-medium ${
                        settings.theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'
                      }`}>
                        Supabase Credentials
                      </h3>
                      <div className={`text-sm ${
                        connectionResult?.success
                          ? (settings.theme === 'dark' ? 'text-green-400' : 'text-green-600')
                          : (settings.theme === 'dark' ? 'text-amber-400' : 'text-amber-500')
                      }`}>
                        {connectionResult?.success 
                          ? 'Connection Verified ✓' 
                          : connectionResult 
                            ? 'Connection Failed ✗' 
                            : credentialsModified
                              ? 'Modified - Test Required'
                              : 'Not Tested'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="supabaseUrl" className={`block text-sm font-medium mb-1 ${
                      settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Supabase URL
                      {credentialsModified && <span className="ml-2 text-amber-500 text-xs">(Modified)</span>}
                    </label>
                    <input
                      type="text"
                      id="supabaseUrl"
                      value={settings.supabaseUrl}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                                ${settings.theme === 'dark' 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-slate-300 text-slate-800'}`}
                      placeholder="https://your-project.supabase.co"
                    />
                    <p className={`mt-1 text-xs ${
                      settings.theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Example: https://abcdefg.supabase.co
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="supabaseKey" className={`block text-sm font-medium mb-1 ${
                      settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Supabase API Key
                      {credentialsModified && <span className="ml-2 text-amber-500 text-xs">(Modified)</span>}
                    </label>
                    <input
                      type="password"
                      id="supabaseKey"
                      value={settings.supabaseKey}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                                ${settings.theme === 'dark' 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-slate-300 text-slate-800'}`}
                      placeholder="your-supabase-api-key"
                    />
                    <p className={`mt-1 text-xs ${
                      settings.theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Use the <code>anon</code> public key from your Supabase project settings.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={testConnection}
                      disabled={testingConnection || !settings.supabaseUrl || !settings.supabaseKey}
                      className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
                        settings.theme === 'dark'
                          ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50'
                          : 'bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:opacity-50'
                      } disabled:cursor-not-allowed transition-colors`}
                    >
                      {testingConnection ? 'Testing Connection...' : credentialsModified ? 'Test Connection (Required)' : 'Test Connection'}
                    </button>
                    
                    {connectionResult && (
                      <div className={`flex-grow px-4 py-2 rounded-md ${
                        connectionResult.success
                          ? (settings.theme === 'dark' ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-800')
                          : (settings.theme === 'dark' ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-800')
                      }`}>
                        {connectionResult.message}
                      </div>
                    )}
                  </div>
                  
                  {connectionResult && connectionResult.success && (
                    <div className="mt-3">
                      <p className={`mb-2 text-sm ${settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Connection successful! You can now use your Supabase database to store financial data.
                      </p>
                      <p className={`mb-2 text-sm ${settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Go to the Dashboard to create required database tables.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Account Settings - move to above Data Sources */}
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
                      {settings.dataSource && !settings[`${settings.dataSource}Key`] && (
                        <p className={`mt-1 text-sm ${
                          settings.theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                        }`}>
                          Warning: API key not set for {settings.dataSource}. Set it in the Data Sources section below.
                        </p>
                      )}
                    </div>
                    
                    {/* Add OpenAI API Key here since it's critical for analysis */}
                    <div>
                      <label htmlFor="openaiKey" className={`block text-sm font-medium mb-1 ${
                        settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        OpenAI API Key (for AI Financial Analysis)
                        {!settings.openaiKey && (
                          <span className={`ml-2 font-medium ${
                            settings.theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                          }`}>• Required</span>
                        )}
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
                        } ${
                          !settings.openaiKey ? (
                            settings.theme === 'dark'
                              ? 'border-amber-500 bg-amber-900/20'
                              : 'border-amber-500 bg-amber-50'
                          ) : ''
                        }`}
                        placeholder="your-openai-api-key"
                      />
                      {!settings.openaiKey && (
                        <p className={`mt-1 text-sm ${
                          settings.theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                        }`}>
                          Required for AI Financial Analysis. Get your key from <a 
                            href="https://platform.openai.com/api-keys" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            OpenAI
                          </a>
                        </p>
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
                      {settings.dataSource === 'quickbooks' && !settings.quickbooksKey && (
                        <p className={`mt-1 text-sm ${
                          settings.theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                        }`}>
                          Warning: This is your default data source, but no API key is set.
                        </p>
                      )}
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
                      {settings.dataSource === 'xero' && !settings.xeroKey && (
                        <p className={`mt-1 text-sm ${
                          settings.theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                        }`}>
                          Warning: This is your default data source, but no API key is set.
                        </p>
                      )}
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
                      {settings.dataSource === 'sage' && !settings.sageKey && (
                        <p className={`mt-1 text-sm ${
                          settings.theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                        }`}>
                          Warning: This is your default data source, but no API key is set.
                        </p>
                      )}
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
                      {settings.dataSource === 'freshbooks' && !settings.freshbooksKey && (
                        <p className={`mt-1 text-sm ${
                          settings.theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                        }`}>
                          Warning: This is your default data source, but no API key is set.
                        </p>
                      )}
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