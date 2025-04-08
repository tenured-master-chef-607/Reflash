// This module provides a consistent fetch API for both browser and Node.js environments

// Export a global fetch that works in both environments
// This is used by Supabase client to make requests
export const setupFetch = () => {
  if (typeof globalThis.fetch !== 'function') {
    console.log('Setting up fetch polyfill for Node.js environment');
    // For Node.js environments without native fetch
    // This should never happen in modern Node.js, but added for safety
    try {
      const nodeFetch = require('node-fetch');
      globalThis.fetch = nodeFetch;
      globalThis.Headers = nodeFetch.Headers;
      globalThis.Request = nodeFetch.Request;
      globalThis.Response = nodeFetch.Response;
    } catch (e) {
      console.error('Failed to polyfill fetch for Node.js', e);
    }
  }
};

// Setup fetch when this module is imported
setupFetch(); 