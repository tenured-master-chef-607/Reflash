@echo off
echo Loading environment variables from .env file...
node load-env.js
echo Starting Next.js development server...
npx next dev --turbopack 