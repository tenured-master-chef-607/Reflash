// Simple script to check if environment variables are loaded from .env
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Log the current working directory
console.log('Current working directory:', process.cwd());

// Check if .env file exists
const envPath = path.resolve(process.cwd(), '.env');
console.log('.env file exists:', fs.existsSync(envPath) ? 'Yes' : 'No');
if (fs.existsSync(envPath)) {
  console.log('.env file path:', envPath);
  console.log('.env file size:', fs.statSync(envPath).size, 'bytes');
  
  try {
    // Print .env file contents (redacting sensitive data)
    const envContents = fs.readFileSync(envPath, 'utf8');
    const redactedContents = envContents.replace(/(KEY|key)=\S+/g, '$1=****REDACTED****');
    console.log('\n.env file contents (redacted):\n', redactedContents);
  } catch (error) {
    console.log('Error reading .env file:', error.message);
  }
}

// Explicitly set paths for dotenv
try {
  // Load .env file
  const result = dotenv.config({ path: envPath });
  console.log('\nDotenv config result:', result.error ? 'Error: ' + result.error.message : 'Success');
} catch (error) {
  console.log('Error loading .env with dotenv:', error.message);
}

// Add process.env dump for complete debugging
console.log('\nProcess ENV keys:', Object.keys(process.env).length);

// Check specifically for our environment variables
console.log('\nEnvironment variables check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? process.env.SUPABASE_URL : 'Not available');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? `Available (length: ${process.env.SUPABASE_KEY.length})` : 'Not available');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL : 'Not available');
console.log('NEXT_PUBLIC_SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_KEY ? `Available (length: ${process.env.NEXT_PUBLIC_SUPABASE_KEY.length})` : 'Not available');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `Available (length: ${process.env.OPENAI_API_KEY.length})` : 'Not available'); 