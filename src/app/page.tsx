'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SupabaseCredentialsCheck from '@/components/SupabaseCredentialsCheck';
import { hasSupabaseCredentials } from '@/utils/environmentOverrides';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Check if user has already seen the credentials form and either:
    // 1) Entered credentials
    // 2) Explicitly skipped entering credentials
    const hasCreds = hasSupabaseCredentials();
    const userSkipped = localStorage.getItem('userSkippedCredentials') === 'true';
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore') === 'true';
    
    // If credentials exist or user has chosen to skip, redirect to dashboard
    if ((hasCreds || userSkipped) && hasVisitedBefore) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <SupabaseCredentialsCheck />
    </div>
  );
}

