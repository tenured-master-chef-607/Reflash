'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Auto-redirect to dashboard
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  // Simple loading indicator during redirect
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="text-center mb-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-medium text-slate-700">Redirecting to dashboard...</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <a
          href="/financial-agents"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-white"
        >
          <h2 className="mb-2 text-xl font-semibold text-indigo-600">
            Financial Agents{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 text-sm text-slate-600">
            Try our AI financial analysis agents for in-depth financial insights.
          </p>
        </a>
        
        <a
          href="/dashboard"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-white"
        >
          <h2 className="mb-2 text-xl font-semibold text-indigo-600">
            Dashboard{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 text-sm text-slate-600">
            View your financial dashboard with interactive visualizations.
          </p>
        </a>
      </div>
    </div>
  );
}

