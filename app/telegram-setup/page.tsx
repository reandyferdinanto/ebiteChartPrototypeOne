'use client';

import { useState, useEffect } from 'react';

export default function TelegramSetupPage() {
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [customUrl, setCustomUrl] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setCustomUrl(window.location.origin + '/api/telegram');
    }
    fetchInfo();
  }, []);

  async function fetchInfo() {
    try {
      const res = await fetch('/api/telegram');
      const data = await res.json();
      setWebhookInfo(data.webhook);
      setBotInfo(data.bot);
    } catch (e) {
      console.error(e);
    }
  }

  async function doAction(action: string, extraParams?: string) {
    setLoading(true);
    setResult('');
    try {
      const url = `/api/telegram?action=${action}${extraParams || ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      await fetchInfo();
    } catch (e: any) {
      setResult('Error: ' + e.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-cyan-400 mb-1">🤖 Telegram Bot Setup</h1>
          <p className="text-gray-400 text-sm">Kelola webhook Telegram bot Ebite Chart</p>
        </div>

        {/* Bot Info */}
        {botInfo && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-cyan-300 mb-2">📱 Bot Info</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">Username</div>
              <div className="text-white font-mono">@{botInfo.username}</div>
              <div className="text-gray-400">Name</div>
              <div className="text-white">{botInfo.first_name}</div>
              <div className="text-gray-400">Bot ID</div>
              <div className="text-white font-mono">{botInfo.id}</div>
            </div>
          </div>
        )}

        {/* Webhook Status */}
        {webhookInfo && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-cyan-300 mb-2">🔗 Webhook Status</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">URL</div>
              <div className="text-white font-mono text-xs break-all">{webhookInfo.url || '(tidak ada)'}</div>
              <div className="text-gray-400">Pending Updates</div>
              <div className={webhookInfo.pending_update_count > 0 ? 'text-yellow-400' : 'text-green-400'}>
                {webhookInfo.pending_update_count ?? 0}
              </div>
              <div className="text-gray-400">Last Error</div>
              <div className="text-red-400 text-xs">{webhookInfo.last_error_message || '(tidak ada)'}</div>
            </div>
          </div>
        )}

        {/* Set Webhook */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">⚙️ Set Webhook URL</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
              placeholder="https://your-domain.com/api/telegram"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white font-mono"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => doAction('set-webhook', `&url=${encodeURIComponent(customUrl)}`)}
              disabled={loading || !customUrl}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? '⏳ Processing...' : '🔗 Set Webhook'}
            </button>
            <button
              onClick={() => doAction('delete-webhook')}
              disabled={loading}
              className="bg-red-700 hover:bg-red-600 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🗑️ Delete Webhook
            </button>
            <button
              onClick={() => doAction('set-commands')}
              disabled={loading}
              className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📋 Register Commands
            </button>
            <button
              onClick={fetchInfo}
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-cyan-300 mb-2">📋 Response</h2>
            <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        {/* Commands Reference */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">📖 Perintah Bot</h2>
          <div className="space-y-3 text-sm">
            {[
              {
                cmd: '/analisa BBCA',
                title: 'Analisis Lengkap 3-in-1',
                desc: 'Gabungan Ryan Filbert + Candle Power + VSA dalam satu ringkasan. Cocok untuk pemula maupun trader berpengalaman.',
                color: 'text-emerald-400',
              },
              {
                cmd: '/besok TLKM',
                title: 'Prediksi Candle Besok',
                desc: 'Prediksi arah candle besok — naik, turun, atau sideways? Menggunakan Candle Power (CPP + 8 indikator konfluens).',
                color: 'text-yellow-400',
              },
              {
                cmd: '/rf BMRI',
                title: 'Ryan Filbert Analysis',
                desc: 'Analisis swing trade 1–4 minggu menggunakan framework Ryan Filbert + Stan Weinstein. Cek fase pasar, volume kering, pivot entry, dan setup breakout.',
                color: 'text-purple-400',
              },
              {
                cmd: '/cek ASII',
                title: 'Analisis Mendalam Wyckoff + VCP + VSA',
                desc: 'Analisis teknikal mendalam: Wyckoff phase, VCP (Volatility Contraction Pattern), VSA signals, Fibonacci, Support & Resistance.',
                color: 'text-cyan-400',
              },
              {
                cmd: '/bantuan',
                title: 'Panduan & Daftar Perintah',
                desc: 'Tampilkan daftar semua perintah bot beserta cara penggunaannya.',
                color: 'text-gray-400',
              },
            ].map(item => (
              <div key={item.cmd} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <code className={`font-mono text-sm font-bold ${item.color}`}>{item.cmd}</code>
                  <span className="text-gray-300">— {item.title}</span>
                </div>
                <p className="text-gray-400 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/40 rounded-lg">
            <p className="text-blue-300 text-xs">
              💡 <strong>Tips:</strong> Setelah klik <strong>Register Commands</strong>, menu <code>/</code> di Telegram akan otomatis menampilkan daftar perintah ini.
            </p>
          </div>
        </div>

        {/* Setup Guide */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">🚀 Cara Setup</h2>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold">1.</span>
              <span>Deploy aplikasi ini ke Vercel/server dengan HTTPS domain.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold">2.</span>
              <span>Masukkan URL webhook: <code className="text-cyan-300 font-mono">https://DOMAIN_ANDA/api/telegram</code></span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold">3.</span>
              <span>Klik tombol <strong>Set Webhook</strong> di atas.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold">4.</span>
              <span>Klik <strong>Register Commands</strong> agar menu perintah muncul di Telegram.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold">5.</span>
              <span>Buka Telegram, cari bot Anda, ketik <code className="text-cyan-300">/start</code>.</span>
            </li>
          </ol>

          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
            <p className="text-yellow-300 text-xs">
              ⚠️ <strong>Catatan:</strong> Webhook hanya bisa diset ke URL HTTPS publik.
              Untuk development lokal, gunakan ngrok atau deploy ke Vercel dulu.
            </p>
          </div>

          {origin && (
            <div className="mt-3 p-3 bg-cyan-900/20 border border-cyan-700/40 rounded-lg">
              <p className="text-cyan-300 text-xs">
                🌐 URL saat ini: <code className="font-mono">{origin}/api/telegram</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

