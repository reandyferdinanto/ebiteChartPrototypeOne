'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ScalpScreenerRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/screener?tab=scalp'); }, [router]);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
    </div>
  );
}
