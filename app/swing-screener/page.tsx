'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SwingScreenerRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/screener?tab=swing'); }, [router]);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  );
}
