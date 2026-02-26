'use client';
import Link from 'next/link';
export default function ScalpScreener() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Scalp Screener</h1>
        <p className="text-gray-400 mb-6">Coming soon - Intraday scalping opportunities</p>
        <Link href="/" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
          Back to Chart
        </Link>
      </div>
    </div>
  );
}
