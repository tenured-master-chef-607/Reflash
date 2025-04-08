// Simple script to load environment variables from .env file
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Get the path to the .env file
const envPath = path.resolve(process.cwd(), '.env');

// Check if the .env file exists
if (fs.existsSync(envPath)) {
  // Read the .env file
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  
  // Set the environment variables
  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }
  
  console.log('Environment variables loaded from:', envPath);
  
  // Log the Supabase variables (redacted)
  console.log('Supabase variables loaded:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
  console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set (length: ' + process.env.SUPABASE_KEY.length + ')' : 'Not set');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('NEXT_PUBLIC_SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'Set (length: ' + process.env.NEXT_PUBLIC_SUPABASE_KEY.length + ')' : 'Not set');
} else {
  console.error('.env file not found at:', envPath);
}

// This script will be required by Next.js at startup
// No need to export anything 