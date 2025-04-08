'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Use setTimeout to ensure this runs after hydration
    // This avoids hydration mismatches by delaying client-side routing
    setTimeout(() => {
      // Clear localStorage values for testing the lander page
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hasVisitedBefore');
        localStorage.removeItem('userSkippedCredentials');
      }
      
      // Always redirect to the lander page from the root
      router.push('/lander');
    }, 0);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      {/* Showing a simple loading state while redirect happens */}
      <div className="animate-pulse text-lg text-gray-600 dark:text-gray-400">
        Loading...
      </div>
    </div>
  );
}

