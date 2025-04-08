import OpenAI from 'openai';
import { getEnv } from './environmentOverrides';

// Get API key from environment variables or overrides
let apiKey = process.env.OPENAI_API_KEY;

// Try to use the environment override if available (which can come from settings)
try {
  apiKey = getEnv('OPENAI_API_KEY') || apiKey;
} catch (error) {
  console.warn('Failed to get OpenAI API key from environment overrides:', error);
}

// Instead of throwing an error when the API key is missing, we'll log a warning
// and create a placeholder OpenAI instance that will be replaced with a proper
// one when the API key is available
if (!apiKey && typeof window === 'undefined') {
  console.warn('Missing OpenAI API key in environment variables. API calls will fail until a key is provided.');
}

// Create a function to get a configured OpenAI client
// This allows us to refresh the client when settings change
function getOpenAIClient() {
  // For client-side, try to get key from localStorage if available
  if (typeof window !== 'undefined' && !apiKey) {
    try {
      const savedSettings = localStorage.getItem('reflashSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.openaiKey) {
          apiKey = settings.openaiKey;
        }
      }
    } catch (error) {
      console.error('Error retrieving API key from localStorage:', error);
    }
  }
  
  // If we still don't have an API key, create a placeholder client that will throw a meaningful error when used
  if (!apiKey) {
    return new OpenAI({
      apiKey: 'placeholder', // Will be replaced when a real key is available
      fetch: () => {
        throw new Error('Missing OpenAI API key. Please set it in the Settings page.');
      }
    });
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
}

// Export the OpenAI client
export const openai = getOpenAIClient();

// Example function to use the OpenAI client
export async function generateCompletion(prompt: string) {
  try {
    // Get a fresh client in case the API key has changed
    const client = getOpenAIClient();
    
    const completion = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4-turbo',
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating completion:', error);
    throw error;
  }
} 