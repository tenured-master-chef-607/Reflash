'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  content: string;
  sender: 'user' | 'bot';
}

interface ChatBoxProps {
  reportDate?: string;
  financialData?: any;
}

const ChatBox = ({ reportDate, financialData }: ChatBoxProps = {}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [financialAnalysis, setFinancialAnalysis] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lastReportDate, setLastReportDate] = useState<string | undefined>(reportDate);
  const botName = "Ricky";

  // Handle report date changes to clear chat when a new report is generated
  useEffect(() => {
    // If the report date has changed, clear the chat and load new data
    if (reportDate && reportDate !== lastReportDate) {
      setMessages([]);
      localStorage.removeItem('reflashChatMessages');
      setLastReportDate(reportDate);
      
      // Load financial analysis from localStorage if it exists
      const savedAnalysis = localStorage.getItem('reflashAnalysisData');
      if (savedAnalysis) {
        try {
          const analysis = JSON.parse(savedAnalysis);
          if (analysis.date === reportDate) {
            setFinancialAnalysis(analysis.data);
          }
        } catch (error) {
          console.error('Error loading saved analysis:', error);
        }
      }
    }
  }, [reportDate, lastReportDate]);
  
  // Load saved messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('reflashChatMessages');
    
    // If the report date has changed or is a new session, clear old messages
    if (reportDate && reportDate !== lastReportDate) {
      setMessages([]);
      localStorage.removeItem('reflashChatMessages');
      console.log('Cleared chat messages due to report date change');
      return;
    }
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages)) {
          setMessages(parsedMessages);
        }
      } catch (error) {
        console.error('Error loading saved chat messages:', error);
        // Clear invalid saved messages
        localStorage.removeItem('reflashChatMessages');
      }
    } else if (reportDate && financialData) {
      // Add welcome message if this is a new chat and we have financial data
      const welcomeMessage: Message = {
        content: `Hi, I'm ${botName}, your personal financial assistant!. Feel free to ask me anything about the numbers, ratios, or anything else you want to know about the financial data.`,
        sender: 'bot'
      };
      setMessages([welcomeMessage]);
    }
  }, [reportDate, financialData, lastReportDate]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('reflashChatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Load and track theme
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      content: input,
      sender: 'user'
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input and show loading
    setInput('');
    setIsLoading(true);

    try {
      // Prepare context for the AI including financial data and analysis
      let context = '';
      
      if (financialData) {
        // Add financial data summary
        context += `
Financial Data for ${reportDate}:
- Total Assets: $${financialData.total_asset.toLocaleString()}
- Total Liabilities: $${financialData.total_liability.toLocaleString()}
- Total Equity: $${financialData.total_equity.toLocaleString()}
- Net Income: $${financialData.net_income.toLocaleString()}

Key Ratios:
- Current Ratio: ${financialData.ratios.current_ratio.toFixed(2)}
- Debt to Equity Ratio: ${financialData.ratios.debt_to_equity_ratio.toFixed(2)}
- Return on Equity: ${financialData.ratios.return_on_equity.toFixed(2)}
- Debt Ratio: ${financialData.ratios.debt_ratio.toFixed(2)}
`;
      }
      
      // Add financial analysis if available
      if (financialAnalysis) {
        context += `\nFinancial Analysis Summary:\n${financialAnalysis}\n`;
      }
      
      // Add conversation history (last 5 messages)
      const recentMessages = messages.slice(-5);
      if (recentMessages.length > 0) {
        context += '\nRecent Conversation:\n';
        recentMessages.forEach(msg => {
          context += `${msg.sender === 'user' ? 'User' : botName}: ${msg.content}\n`;
        });
      }
      
      // Combine with the current user query and personalize the prompt
      const fullPrompt = `${context}\n\nUser: ${input}\n\n${botName} (You are ${botName}, a friendly and knowledgeable financial assistant with a touch of humor. Provide a helpful, concise response about the financial data):`;
      
      // Send to the AI Assistant API through the agents endpoint
      const response = await fetch('/api/financial/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'comprehensive',
          prompt: fullPrompt,
          targetDate: reportDate,
          balanceSheet: financialData,
          companyName: 'Your Company',
          industry: 'Your Industry'
        }),
      });
      
      const result = await response.json();
      
      if (!result.success && result.error) {
        throw new Error(result.error);
      }
      
      // Use the analysis from the comprehensive result or fall back to a simpler response
      let aiResponse = '';
      
      if (result.analysis) {
        aiResponse = result.analysis;  // Prioritize the direct chat response
      } else if (result.results?.financial?.analysis) {
        aiResponse = result.results.financial.analysis;
      } else {
        // Fallback to a generic response
        aiResponse = getGenericResponse(input);
      }
      
      // Add bot message
      const botMessage: Message = {
        content: aiResponse,
        sender: 'bot'
      };
      
      setMessages(prev => [...prev, botMessage]);
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add a fallback response
      const fallbackMessage: Message = {
        content: "I'm sorry, I couldn't process your request at the moment. Please try again later.",
        sender: 'bot'
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      
    } finally {
      setIsLoading(false);
    }
  };

  // Get a generic response based on the query
  const getGenericResponse = (query: string): string => {
    // Demo responses
    const demoResponses = [
      "Based on the financial data, the current ratio is 1.5, which indicates good short-term financial health.",
      "The debt-to-equity ratio has decreased from 0.8 to 0.6 over the past year, showing improved financial leverage.",
      "Net profit margins have improved by 2.3% compared to the previous quarter.",
      "Cash flow from operations has increased by 15% year-over-year.",
      "The inventory turnover ratio is 4.2, which is within industry standards for retail.",
      "Return on equity (ROE) is currently at 12.3%, showing effective use of equity funding.",
      "The company's gross profit margin is 38%, which is above the industry average of 32%."
    ];

    // Select response based on query type
    if (query.toLowerCase().includes('ratio') || query.toLowerCase().includes('current')) {
      return demoResponses[0];
    } else if (query.toLowerCase().includes('debt') || query.toLowerCase().includes('equity')) {
      return demoResponses[1];
    } else if (query.toLowerCase().includes('profit') || query.toLowerCase().includes('margin')) {
      return demoResponses[2];
    } else if (query.toLowerCase().includes('cash') || query.toLowerCase().includes('flow')) {
      return demoResponses[3];
    } else if (query.toLowerCase().includes('inventory') || query.toLowerCase().includes('turnover')) {
      return demoResponses[4];
    } else if (query.toLowerCase().includes('roe') || query.toLowerCase().includes('return')) {
      return demoResponses[5];
    } else {
      // Default to a random response
      const randomIndex = Math.floor(Math.random() * demoResponses.length);
      return demoResponses[randomIndex];
    }
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('reflashChatMessages');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className={`text-xs px-2 py-1 rounded ${
              theme === 'dark' 
                ? 'bg-slate-600 hover:bg-slate-500 text-slate-200' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            Clear Chat
          </button>
        )}
        <div className="flex-grow"></div>
      </div>
      
      <div className={`chat-messages mb-4 max-h-60 overflow-y-auto rounded-md p-4 ${
        theme === 'dark' ? 'bg-slate-700' : 'bg-slate-50'
      }`}>
        {messages.length === 0 && (
          <div className={`text-center py-6 text-sm ${
            theme === 'dark' ? 'text-slate-300' : 'text-slate-500'
          }`}>
            <p>Ask {botName} anything about the financial data to get insights.</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <button 
                onClick={() => setInput(`Hey ${botName}, what is the current ratio telling us?`)} 
                className={`px-3 py-1 rounded-full text-xs transition ${
                  theme === 'dark' 
                    ? 'bg-slate-600 hover:bg-slate-500 text-slate-200' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                What is the current ratio?
              </button>
              <button 
                onClick={() => setInput(`${botName}, how has the debt-to-equity ratio changed?`)} 
                className={`px-3 py-1 rounded-full text-xs transition ${
                  theme === 'dark' 
                    ? 'bg-slate-600 hover:bg-slate-500 text-slate-200' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Debt-to-equity trends
              </button>
              <button 
                onClick={() => setInput(`Is the profit margin improving, ${botName}?`)} 
                className={`px-3 py-1 rounded-full text-xs transition ${
                  theme === 'dark' 
                    ? 'bg-slate-600 hover:bg-slate-500 text-slate-200' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Profit margin analysis
              </button>
            </div>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message mb-3 ${
              message.sender === 'user' 
                ? 'user-message' 
                : 'bot-message'
            }`}
          >
            {message.sender === 'bot' && (
              <div className="flex items-center mb-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-1 ${
                  theme === 'dark' ? 'bg-blue-800' : 'bg-blue-100'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 ${
                    theme === 'dark' ? 'text-blue-200' : 'text-blue-700'
                  }`}>
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                </div>
                <div className={`text-xs font-medium ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                }`}>{botName}</div>
              </div>
            )}
            
            {message.sender === 'user' && (
              <div className="flex items-center justify-end mb-1">
                <div className={`text-xs font-medium ${
                  theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'
                }`}>You</div>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center ml-1 ${
                  theme === 'dark' ? 'bg-indigo-800' : 'bg-indigo-100'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-3 h-3 ${
                    theme === 'dark' ? 'text-indigo-200' : 'text-indigo-700'
                  }`}>
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
            
            <div className={`${
              message.sender === 'user' ? 'text-right' : ''
            } ${
              theme === 'dark' ? 'text-slate-100' : 'text-slate-700'
            }`}>
              {message.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="bot-message">
            <div className="flex items-center mb-1">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-1 ${
                theme === 'dark' ? 'bg-blue-800' : 'bg-blue-100'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 ${
                  theme === 'dark' ? 'text-blue-200' : 'text-blue-700'
                }`}>
                  <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                </svg>
              </div>
              <div className={`text-xs font-medium ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
              }`}>{botName}</div>
            </div>
            <div className={`typing-indicator ${theme === 'dark' ? 'dark' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className={`flex border rounded-md overflow-hidden ${
        theme === 'dark' ? 'border-slate-600' : 'border-slate-200'
      }`}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${botName} about the financial data...`} 
          className={`flex-1 p-3 outline-none text-sm ${
            theme === 'dark' 
              ? 'bg-slate-700 text-white placeholder-slate-400' 
              : 'bg-white text-slate-800 placeholder-slate-400'
          }`}
        />
        <button 
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`px-4 ${
            theme === 'dark' 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          } ${!input.trim() || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 