import type { NextConfig } from "next";
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Manually load environment variables from .env file
// This is more reliable than using dotenv.config() directly
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
    console.log('Environment variables loaded from .env file');
  }
} catch (err) {
  console.error('Error loading .env file:', err);
}

// Log environment variables for debugging during build
console.log('Next.js Environment Check:');
console.log('SUPABASE_URL available:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_KEY available:', !!process.env.SUPABASE_KEY);
console.log('NEXT_PUBLIC_SUPABASE_URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_KEY available:', !!process.env.NEXT_PUBLIC_SUPABASE_KEY);

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  // Allow direct fetching from Supabase
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
