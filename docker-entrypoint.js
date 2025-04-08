#!/usr/bin/env node

const { spawn } = require('node:child_process')

const env = { ...process.env }

// Set default values for critical environment variables if they're missing
if (!env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('⚠️ Missing environment variable: NEXT_PUBLIC_SUPABASE_URL - Setting default placeholder value')
  env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder-url.supabase.co'
  env.SUPABASE_URL = env.SUPABASE_URL || 'https://placeholder-url.supabase.co'
}

if (!env.NEXT_PUBLIC_SUPABASE_KEY) {
  console.warn('⚠️ Missing environment variable: NEXT_PUBLIC_SUPABASE_KEY - Setting default placeholder value')
  env.NEXT_PUBLIC_SUPABASE_KEY = 'placeholder_key'
  env.SUPABASE_KEY = env.SUPABASE_KEY || 'placeholder_key'
}

if (!env.OPENAI_API_KEY) {
  console.warn('⚠️ Missing environment variable: OPENAI_API_KEY - API calls may fail')
}

;(async() => {
  // If running the web server then prerender pages
  //if (process.argv.slice(-3).join(' ') === 'npm run start') {
    //await exec('npx next build --experimental-build-mode generate')
  //}

  // launch application
  await exec(process.argv.slice(2).join(' '))
})()

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed rc=${code}`))
      }
    })
  })
}
