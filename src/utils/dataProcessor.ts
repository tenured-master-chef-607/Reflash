import { supabase } from '@/utils/supabase';
import { openai } from '@/utils/openai';

/**
 * Retrieves data from Supabase and processes it using OpenAI
 */
export async function processData(tableName: string, column: string) {
  try {
    // Fetch data from Supabase
    const { data, error } = await supabase
      .from(tableName)
      .select(column)
      .limit(10);
    
    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      return { result: 'No data found' };
    }
    
    // Example algorithm - summarize the data using OpenAI
    const dataString = JSON.stringify(data);
    const prompt = `Summarize this data in a concise way:\n${dataString}`;
    
    const summary = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4-turbo',
    });
    
    return {
      originalData: data,
      summary: summary.choices[0].message.content,
    };
  } catch (error) {
    console.error('Error in data processing:', error);
    throw error;
  }
} 