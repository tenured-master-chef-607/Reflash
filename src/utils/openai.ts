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

// Instead of showing a warning, we'll just create a mock OpenAI instance
if (!apiKey || apiKey === 'placeholder_openai_key') {
  if (typeof window === 'undefined') {
    console.log('Using mock OpenAI implementation - API key not provided');
  }
  apiKey = 'mock_key_for_placeholder';
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
  
  // If we have a mock key, return a mock client that provides placeholder responses
  if (!apiKey || apiKey === 'mock_key_for_placeholder' || apiKey === 'placeholder_openai_key') {
    const mockClient = {
      chat: {
        completions: {
          create: async ({ messages }: { messages: Array<{ role: string, content: string }> }) => {
            console.log('Using mock OpenAI client - returning placeholder response');
            // Return a mock response based on the prompt
            return {
              choices: [{ 
                message: { 
                  content: "This is a placeholder response from the mock OpenAI client. To get real responses, please set your OpenAI API key in Settings." 
                } 
              }]
            };
          }
        }
      }
    };
    
    return mockClient as unknown as OpenAI;
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
    // Return a fallback response instead of throwing
    return "Unable to generate a response. If you're seeing this message repeatedly, please check your OpenAI API key in Settings.";
  }
} 