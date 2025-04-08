'use client';

import { useEffect, useState } from 'react';
import { getEnv } from '@/utils/environmentOverrides';

export default function EnvironmentCheckPage() {
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    // Check environment variables
    const status = {
      SUPABASE_URL: !!getEnv('SUPABASE_URL'),
      SUPABASE_KEY: !!getEnv('SUPABASE_KEY'),
      NEXT_PUBLIC_SUPABASE_URL: !!getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      NEXT_PUBLIC_SUPABASE_KEY: !!getEnv('NEXT_PUBLIC_SUPABASE_KEY'),
      OPENAI_API_KEY: !!getEnv('OPENAI_API_KEY'),
    };
    
    setEnvStatus(status);
    
    // Log to console for debugging
    // console.log('Environment variables check:');
    // Object.entries(status).forEach(([key, value]) => {
    //   console.log(`${key} available:`, value);
    // });
  }, []);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Check</h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {Object.entries(envStatus).map(([key, value]) => (
            <div key={key} className={value ? 'text-green-600' : 'text-red-600'}>
              {key} available: {value.toString()}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
} 