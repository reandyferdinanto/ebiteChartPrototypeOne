'use client';

import { useState } from 'react';
import Link from 'next/link';

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);
const IconChart = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
);
const IconTarget = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth={2} />
    <circle cx="12" cy="12" r="6" strokeWidth={2} />
    <circle cx="12" cy="12" r="2" strokeWidth={2} />
  </svg>
);
const IconBolt = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const IconSearch = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const IconBook = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const IconBrain = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);
const IconTrend = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const IconWarning = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);
const IconArrow = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const IconClock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconShield = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

// ── Section component ─────────────────────────────────────────────────────────
function Section({ id, icon, title, color, children }: {
  id: string; icon: React.ReactNode; title: string; color: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div id={id} className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 px-4 md:px-6 py-4 text-left ${color} hover:brightness-110 transition`}
      >
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-black/30">{icon}</span>
          <span className="font-bold text-base md:text-lg">{title}</span>
        </div>
        <svg className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 md:px-6 py-4 space-y-4">{children}</div>}
    </div>
  );
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{children}</span>;
}

function StepBox({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/40 border border-blue-500/50 flex items-center justify-center text-xs font-bold text-blue-300">{step}</div>
      <div>
        <div className="font-semibold text-white text-sm">{title}</div>
        <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

function SignalRow({ signal, meaning, action }: { signal: string; meaning: string; action: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <div className="font-bold text-white">{signal}</div>
      <div className="text-gray-300">{meaning}</div>
      <div className="text-yellow-300">{action}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GuidePage() {
  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'chart', label: 'Chart' },
    { id: 'indicators', label: 'Indicators' },
    { id: 'signals', label: 'VSA Signals' },
    { id: 'candle-power', label: 'Candle Power' },
    { id: 'vcp-screener', label: 'VCP Screener' },
    { id: 'swing-screener', label: 'Swing Screener' },
    { id: 'scalp-screener', label: 'Scalp Screener' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'which-to-use', label: 'Which to Use?' },
    { id: 'entry-guide', label: 'Entry Guide' },
    { id: 'risk', label: 'Risk Mgmt' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-3 md:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition">
              <IconBack />
              <span className="text-sm hidden sm:inline">Back</span>
            </Link>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="font-bold text-white">Ebite Chart — User Guide</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="backdrop-blur-md bg-blue-600/30 border border-blue-500/40 hover:bg-blue-600/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition">Chart</Link>
            <Link href="/vcp-screener" className="backdrop-blur-md bg-purple-600/30 border border-purple-500/40 hover:bg-purple-600/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition">VCP</Link>
            <Link href="/scalp-screener" className="backdrop-blur-md bg-emerald-600/30 border border-emerald-500/40 hover:bg-emerald-600/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition">Scalp</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-3 md:px-6 py-6 md:py-8 space-y-6">

        {/* Hero */}
        <div className="text-center space-y-3 py-4">
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
            Ebite Chart — Complete User Guide
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
            Panduan lengkap penggunaan semua fitur: Chart, Screener, Analisis, dan cara membaca sinyal untuk entry yang tepat.
          </p>
          {/* Quick nav */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`}
                className="backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-1 rounded-full text-xs transition text-gray-300 hover:text-white">
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* ── 1. OVERVIEW ── */}
        <Section id="overview" icon={<IconBook />} title="1. Overview — Apa itu Ebite Chart?" color="bg-gradient-to-r from-slate-800 to-slate-700">
          <p className="text-sm text-gray-300 leading-relaxed">
            Ebite Chart adalah platform analisis teknikal saham Indonesia berbasis teori <strong className="text-white">Wyckoff</strong>, <strong className="text-white">Volume Spread Analysis (VSA)</strong>, dan <strong className="text-white">Volatility Contraction Pattern (VCP)</strong>. Platform ini memiliki 5 fitur utama:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { title: 'Chart', icon: '📊', desc: 'Grafik interaktif dengan indikator MA, VSA, VCP, Support/Resistance, MACD, Volume, dan Candle Power.', link: '/', color: 'border-blue-500/30 bg-blue-950/20' },
              { title: 'Analysis', icon: '🧠', desc: 'Analisis mendalam satu saham: Wyckoff phase, VSA signal, CPP, EVR, rekomendasi BUY/WAIT/SELL.', link: '/analysis', color: 'border-violet-500/30 bg-violet-950/20' },
              { title: 'VCP Screener', icon: '🎯', desc: 'Scanner semua saham IDX untuk pola VCP Base, Sniper Entry, Dry Up, dan Iceberg.', link: '/vcp-screener', color: 'border-purple-500/30 bg-purple-950/20' },
              { title: 'Swing Screener', icon: '📈', desc: 'Scanner saham yang sudah naik 5%+ lalu cooldown dengan power untuk lanjut naik (1-5 hari).', link: '/swing-screener', color: 'border-emerald-500/30 bg-emerald-950/20' },
              { title: 'Scalp Screener', icon: '⚡', desc: 'Scanner intraday (5m/15m) mencari momentum setelah markup + cooldown untuk entry scalping.', link: '/scalp-screener', color: 'border-yellow-500/30 bg-yellow-950/20' },
            ].map(f => (
              <Link key={f.title} href={f.link} className={`rounded-xl p-3 border ${f.color} hover:brightness-125 transition space-y-1`}>
                <div className="font-bold text-white flex items-center gap-2"><span className="text-xl">{f.icon}</span>{f.title}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{f.desc}</div>
                <div className="text-xs text-blue-400 flex items-center gap-1 mt-1"><IconArrow /> Buka →</div>
              </Link>
            ))}
          </div>
          <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-3 text-xs text-gray-300 leading-relaxed">
            <strong className="text-blue-300">Alur yang disarankan:</strong> Gunakan <strong>Screener</strong> untuk menemukan kandidat → <strong>Chart</strong> untuk konfirmasi visual → <strong>Analysis</strong> untuk keputusan entry dan level SL/TP.
          </div>
        </Section>

        {/* ── 2. CHART ── */}
        <Section id="chart" icon={<IconChart />} title="2. Chart — Cara Membaca Grafik" color="bg-gradient-to-r from-blue-900 to-blue-800">
          <div className="space-y-4">
            {/* Timeframe */}
            <div>
              <h4 className="font-semibold text-blue-300 text-sm mb-2 flex items-center gap-2"><IconClock /> Timeframe</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { tf: '5m', use: 'Scalping intraday (noise tinggi)' },
                  { tf: '15m', use: 'Scalping intraday (lebih stabil)' },
                  { tf: '1H', use: 'Swing short (1-2 hari)' },
                  { tf: '4H', use: 'Swing medium (2-5 hari)' },
                  { tf: '1D', use: 'Swing utama (1-3 minggu)' },
                  { tf: '1W', use: 'Position trade (bulan)' },
                  { tf: '1M', use: 'Trend makro (tahunan)' },
                ].map(t => (
                  <div key={t.tf} className="bg-white/5 border border-white/10 rounded-lg p-2">
                    <div className="font-bold text-white">{t.tf}</div>
                    <div className="text-gray-400 mt-0.5">{t.use}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cara pakai */}
            <div>
              <h4 className="font-semibold text-blue-300 text-sm mb-2">Cara Menggunakan Chart</h4>
              <div className="space-y-2">
                <StepBox step="1" title="Ketik kode saham di search bar" desc="Cukup ketik tanpa .JK. Contoh: BBCA, BBRI, TLKM, FIRE. Tekan Enter atau klik Search." />
                <StepBox step="2" title="Pilih timeframe" desc="Default 1D (harian). Untuk scalping pilih 5m/15m. Untuk swing pilih 1D." />
                <StepBox step="3" title="Aktifkan indikator" desc="Klik tombol MA, VSA Pattern, atau Power Candle untuk menyalakan/mematikan indikator." />
                <StepBox step="4" title="Baca Trading Signal" desc="Panel di atas chart menampilkan analisis Wyckoff, VSA, Power Candle, dan Kesimpulan secara otomatis." />
                <StepBox step="5" title="Zoom & scroll" desc="Gunakan scroll mouse untuk zoom. Drag untuk pan kiri/kanan. Support & Resistance ditampilkan sebagai area hijau/merah." />
              </div>
            </div>

            {/* Indicators buttons */}
            <div>
              <h4 className="font-semibold text-blue-300 text-sm mb-2">Tombol Indikator (Quick Modes)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                {[
                  { btn: 'MA', desc: 'Moving Average 5, 20, 50, 200. Warna berbeda tiap periode. Aktif default.' },
                  { btn: 'VSA Pattern', desc: 'Tandai Iceberg, Dry Up, VCP Base, Distribusi, Sniper Entry di chart.' },
                  { btn: 'Power Candle', desc: 'Titik berwarna di atas candle = skor kekuatan 0-100 untuk prediksi next candle.' },
                  { btn: 'S/R Zones', desc: 'Area Support (hijau) dan Resistance (merah) berbasis Pivot High/Low + ATR.' },
                ].map(b => (
                  <div key={b.btn} className="bg-white/5 border border-white/10 rounded-lg p-2">
                    <div className="font-bold text-cyan-300">[{b.btn}]</div>
                    <div className="text-gray-400 mt-0.5 leading-relaxed">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* MA explanation */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-1">
              <div className="font-semibold text-white mb-2">Membaca Moving Average (MA)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { ma: 'MA5 (putih)', meaning: 'Short-term momentum. Candle di atas = bullish jangka pendek.' },
                  { ma: 'MA20 (biru)', meaning: 'Support utama swing. Candle bouncing dari MA20 = sinyal entry.' },
                  { ma: 'MA50 (hijau)', meaning: 'Support medium. Breakout MA50 = tren naik terkonfirmasi.' },
                  { ma: 'MA200 (oranye)', meaning: 'Tren jangka panjang. Di atas MA200 = bull market.' },
                ].map(m => (
                  <div key={m.ma} className="flex gap-2">
                    <div className="font-bold text-yellow-300 w-28 flex-shrink-0">{m.ma}</div>
                    <div className="text-gray-400">{m.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── 3. INDICATORS ── */}
        <Section id="indicators" icon={<IconBrain />} title="3. Indikator — Teori Dasar" color="bg-gradient-to-r from-violet-900 to-violet-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Wyckoff */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="font-bold text-violet-300 flex items-center gap-2">🏛️ Wyckoff Theory</div>
              <div className="text-xs text-gray-400 leading-relaxed">
                Pasar bergerak dalam 4 fase: Accumulation → Markup → Distribution → Markdown. Operator besar (smart money) mengakumulasi diam-diam, lalu mendorong harga naik.
              </div>
              <div className="space-y-1 text-xs">
                {[
                  { phase: 'ACCUMULATION', color: 'text-blue-400', desc: 'Harga mendatar. Smart money beli.' },
                  { phase: 'MARKUP', color: 'text-green-400', desc: 'Harga naik. Di atas MA20 & MA50.' },
                  { phase: 'DISTRIBUTION', color: 'text-yellow-400', desc: 'Harga mendatar di atas. Smart money jual.' },
                  { phase: 'MARKDOWN', color: 'text-red-400', desc: 'Harga turun. Di bawah MA20 & MA50.' },
                ].map(p => (
                  <div key={p.phase} className="flex gap-2">
                    <span className={`font-bold w-28 flex-shrink-0 ${p.color}`}>{p.phase}</span>
                    <span className="text-gray-400">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VSA */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="font-bold text-cyan-300 flex items-center gap-2">📊 VSA (Volume Spread Analysis)</div>
              <div className="text-xs text-gray-400 leading-relaxed">
                Menganalisis kombinasi Volume + Spread (High-Low) + Posisi Close untuk mengidentifikasi aktivitas smart money.
              </div>
              <div className="space-y-1 text-xs">
                {[
                  { term: 'Effort', desc: 'Volume = seberapa besar usaha (transaksi).' },
                  { term: 'Result', desc: 'Spread = seberapa jauh harga bergerak.' },
                  { term: 'Absorption', desc: 'Vol tinggi, spread kecil = ada yang serap.' },
                  { term: 'No Supply', desc: 'Vol kecil saat turun = penjual habis.' },
                  { term: 'No Demand', desc: 'Vol kecil saat naik = pembeli lemah.' },
                ].map(v => (
                  <div key={v.term} className="flex gap-2">
                    <span className="font-bold text-cyan-300 w-20 flex-shrink-0">{v.term}</span>
                    <span className="text-gray-400">{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VCP */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="font-bold text-emerald-300 flex items-center gap-2">📉 VCP (Volatility Contraction Pattern)</div>
              <div className="text-xs text-gray-400 leading-relaxed">
                Pola kontraksi volatilitas dari Mark Minervini. Koreksi semakin dangkal dan volume semakin kering → penawaran habis → siap breakout.
              </div>
              <div className="space-y-1 text-xs">
                {[
                  { term: 'Base', desc: 'Harga mendatar, makin sempit.' },
                  { term: 'Dry Up', desc: 'Volume sangat rendah = supply habis.' },
                  { term: 'Pivot', desc: 'Titik paling sempit = entry ideal.' },
                  { term: 'Breakout', desc: 'Vol meledak menembus pivot.' },
                  { term: 'RMV ≤ 15', desc: 'Kompresi volatilitas ekstrem.' },
                ].map(v => (
                  <div key={v.term} className="flex gap-2">
                    <span className="font-bold text-emerald-300 w-20 flex-shrink-0">{v.term}</span>
                    <span className="text-gray-400">{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CPP & EVR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="font-bold text-yellow-300">📈 CPP (Cumulative Power Prediction)</div>
              <div className="text-xs text-gray-400 leading-relaxed">
                Formula prediksi arah next candle berdasarkan 5 hari terakhir. Menghitung <code className="text-cyan-300">CBD × VAM</code> dengan pembobotan waktu.
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex gap-2"><span className="font-bold text-green-400 w-20">CPP &gt; +0.5</span><span className="text-gray-400">Bullish — kemungkinan candle besok hijau</span></div>
                <div className="flex gap-2"><span className="font-bold text-gray-400 w-20">±0.5</span><span className="text-gray-400">Netral / Konsolidasi</span></div>
                <div className="flex gap-2"><span className="font-bold text-red-400 w-20">CPP &lt; -0.5</span><span className="text-gray-400">Bearish — kemungkinan candle besok merah</span></div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="font-bold text-orange-300">⚖️ EVR (Effort vs Result)</div>
              <div className="text-xs text-gray-400 leading-relaxed">
                Mengukur harmonisasi Volume (upaya) vs Pergerakan Harga (hasil). Anomali = aktivitas smart money.
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex gap-2"><span className="font-bold text-green-400 w-24">EVR positif</span><span className="text-gray-400">Harga naik proporsional dengan volume</span></div>
                <div className="flex gap-2"><span className="font-bold text-red-400 w-24">EVR negatif</span><span className="text-gray-400">Vol tinggi tapi harga tidak naik = perlawanan</span></div>
                <div className="flex gap-2"><span className="font-bold text-blue-400 w-24">Absorpsi</span><span className="text-gray-400">Vol tinggi + candle kecil = institusi serap supply</span></div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 4. VSA SIGNALS ── */}
        <Section id="signals" icon={<IconSearch />} title="4. VSA Signals — Cara Membaca Sinyal" color="bg-gradient-to-r from-cyan-900 to-teal-900">
          <div className="text-xs text-gray-500 mb-2">Header kolom: <strong className="text-gray-300">Sinyal</strong> | <strong className="text-gray-300">Artinya</strong> | <strong className="text-gray-300">Aksi</strong></div>

          {/* Bullish signals */}
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 space-y-2">
            <div className="font-bold text-emerald-400 text-xs uppercase tracking-wider mb-2">✅ Sinyal Bullish (BUY)</div>
            <SignalRow signal="🟢 SC — Selling Climax" meaning="Vol ultra-tinggi, candle merah besar, close di atas 40% rentang. Publik panik jual, institusi beli." action="BELI — reversal kuat, akumulasi institusi" />
            <SignalRow signal="🟢 NS — No Supply" meaning="Low baru tapi volume kecil, spread sempit. Penjual kehabisan. Di atas MA20." action="BELI — supply habis, tekanan jual selesai" />
            <SignalRow signal="🎯 Sniper Entry" meaning="VCP pivot + dry up + RMV≤15 + di atas MA20&MA50. Setup sempurna." action="KUAT BELI — entry terbaik dengan RR optimal" />
            <SignalRow signal="🏆 VCP Dry-Up" meaning="VCP base + volume kering + body kecil. Pasokan habis." action="BELI — high probability breakout" />
            <SignalRow signal="🧊 VCP Iceberg" meaning="VCP base + vol tinggi tapi spread sempit. Institusi beli diam-diam." action="BELI — hidden accumulation" />
            <SignalRow signal="⚡ HAKA" meaning="Candle hijau besar + vol sangat tinggi + close dekat high. Buying aggression." action="BELI / HOLD — konfirmasi breakout" />
            <SignalRow signal="🥷 Dry Up" meaning="Volume sangat rendah, body kecil. Tidak ada penjual." action="PANTAU — support test, bisa entry konservatif" />
          </div>

          {/* Bearish signals */}
          <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-3 space-y-2">
            <div className="font-bold text-red-400 text-xs uppercase tracking-wider mb-2">❌ Sinyal Bearish (AVOID)</div>
            <SignalRow signal="🔴 UT — Up-Thrust" meaning="Breakout palsu: spread lebar ke atas, vol tinggi, close di bawah 30%. Jebakan bullish." action="HINDARI / JUAL — distribusi tersembunyi" />
            <SignalRow signal="🔴 ND — No Demand" meaning="High baru tapi vol kecil + spread sempit. Reli tanpa dukungan pembeli." action="HATI-HATI — momentum lemah, potensi reversal" />
            <SignalRow signal="🔴 BC — Buying Climax" meaning="Vol ultra-tinggi, candle hijau besar, close bawah. Euforia publik, institusi distribusi." action="JUAL / KURANGI — distribusi aktif" />
            <SignalRow signal="🩸 Distribusi" meaning="Candle merah + vol &gt;1.5× rata-rata + accRatio &lt;0.5." action="HINDARI / JUAL — institusi melepas saham" />
          </div>

          {/* Neutral */}
          <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-3 space-y-2">
            <div className="font-bold text-blue-400 text-xs uppercase tracking-wider mb-2">👀 Sinyal Netral (WATCH)</div>
            <SignalRow signal="📉 VCP Base" meaning="Volatilitas menyempit, harga dekat high. Belum pivot." action="WATCH — tunggu dry up atau breakout vol" />
            <SignalRow signal="📍 VCP Pivot" meaning="RMV ≤ 15, kompresi ekstrem. Sudah sangat ketat." action="SIAP ENTRY — tunggu konfirmasi candle" />
            <SignalRow signal="⚖️ Absorpsi" meaning="Vol tinggi + spread kecil. Ada yang menahan harga." action="PANTAU — tentukan arah absorpsi (beli/jual)" />
          </div>

          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-xs text-gray-300 leading-relaxed">
            <strong className="text-amber-300">Tips:</strong> Sinyal terkuat muncul saat beberapa sinyal <em>konfluens</em> (saling mendukung). Contoh: <strong>NS + VCP Base + CPP Bullish + di atas MA20</strong> = setup sangat kuat. Satu sinyal saja tidak cukup untuk entry.
          </div>
        </Section>

        {/* ── 5. CANDLE POWER ── */}
        <Section id="candle-power" icon={<IconBolt />} title="5. Candle Power — Prediksi Next Candle" color="bg-gradient-to-r from-yellow-900 to-amber-900">
          <div className="text-sm text-gray-300 leading-relaxed">
            Candle Power adalah <strong className="text-white">skor prediksi kekuatan candle berikutnya</strong> (0–100) berdasarkan analisis Wyckoff, VSA, dan CPP. Ditampilkan sebagai titik berwarna di atas candle (5 candle terakhir).
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { range: '90–100', color: 'bg-green-900 border-green-500 text-green-300', label: 'Sangat Kuat', desc: 'Absorpsi / Sign of Strength. Kemungkinan besar bullish besok.' },
              { range: '70–89', color: 'bg-teal-900 border-teal-500 text-teal-300', label: 'Kuat', desc: 'Momentum baik. Uptrend terjaga. Pertahankan posisi.' },
              { range: '50–69', color: 'bg-yellow-900 border-yellow-500 text-yellow-300', label: 'Netral', desc: 'Tidak jelas. Bisa naik atau turun. Tunggu konfirmasi.' },
              { range: '25–49', color: 'bg-orange-900 border-orange-500 text-orange-300', label: 'Lemah', desc: 'Supply dominan. Hati-hati, potensi turun.' },
              { range: '0–24', color: 'bg-red-900 border-red-500 text-red-300', label: 'Sangat Lemah', desc: 'Distribusi / Upthrust. Kemungkinan besar bearish besok.' },
            ].map(s => (
              <div key={s.range} className={`rounded-xl p-3 border ${s.color} bg-opacity-30 space-y-1`}>
                <div className="font-bold text-lg">{s.range}</div>
                <div className="font-semibold text-sm">{s.label}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-2">
            <div className="font-semibold text-white">Faktor yang mempengaruhi skor:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-400">
              <div className="flex items-start gap-2"><IconCheck /><span><strong className="text-white">Posisi close dalam candle:</strong> Close di atas = bullish. Close di bawah = bearish.</span></div>
              <div className="flex items-start gap-2"><IconCheck /><span><strong className="text-white">Volume ratio:</strong> Vol tinggi + close atas = kuat. Vol rendah saat turun = no supply.</span></div>
              <div className="flex items-start gap-2"><IconCheck /><span><strong className="text-white">Posisi vs MA20/MA50:</strong> Hammer di MA20 = skor tinggi meski candle merah.</span></div>
              <div className="flex items-start gap-2"><IconCheck /><span><strong className="text-white">Accumulation ratio:</strong> Vol beli vs jual 10 hari. Dominasi beli = skor naik.</span></div>
              <div className="flex items-start gap-2"><IconCheck /><span><strong className="text-white">Wyckoff context:</strong> No Supply, Stopping Volume, Sign of Strength = skor premium.</span></div>
              <div className="flex items-start gap-2"><IconCheck /><span><strong className="text-white">CPP:</strong> Momentum 5 hari. CPP positif + skor tinggi = konfluens kuat.</span></div>
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-xs text-gray-300">
            <strong className="text-amber-300">Catatan penting:</strong> Candle Power adalah <em>probabilitas</em>, bukan kepastian. Candle merah dengan skor 85+ (seperti LAJU hammer di MA20 dengan vol rendah) tetap prediksi bullish karena VSA menunjukkan "No Supply" meski candle terlihat merah. Konfirmasi dengan volume hari berikutnya.
          </div>
        </Section>

        {/* ── 6. VCP SCREENER ── */}
        <Section id="vcp-screener" icon={<IconTarget />} title="6. VCP Screener — Swing Trading Setup" color="bg-gradient-to-r from-purple-900 to-indigo-900">
          <p className="text-sm text-gray-300 leading-relaxed">
            VCP Screener memindai semua saham IDX untuk menemukan <strong className="text-white">pola Volatility Contraction Pattern</strong> — saham yang sedang membentuk base dengan supply menipis, siap breakout. Cocok untuk <strong className="text-white">swing trading 1–4 minggu</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-purple-300 text-sm">Cara Pakai:</h4>
              <div className="space-y-2">
                <StepBox step="1" title="Pilih Filter: Liquid atau All IDX" desc="Liquid = 200+ saham aktif, lebih cepat (1-2 menit). All IDX = 800+ saham, lebih komprehensif (5-10 menit)." />
                <StepBox step="2" title="Set Minimum Score" desc="Default 50. Naikkan ke 70+ untuk hasil lebih selektif. Turunkan ke 45 jika ingin lebih banyak kandidat." />
                <StepBox step="3" title="Klik Scan Stocks" desc="Tunggu proses scanning. Progress ditampilkan di layar." />
                <StepBox step="4" title="Pilih Tab: Sniper / VCP / Dry Up / All" desc="Sniper = setup terbaik. VCP = sedang forming. Dry Up = support test." />
                <StepBox step="5" title="Klik View untuk lihat chart" desc="Chart akan otomatis membuka saham dengan timeframe 1D." />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-300 text-sm">Prioritas Tab:</h4>
              <div className="space-y-2 text-xs">
                {[
                  { tab: '🎯 Sniper', priority: 'TERTINGGI', desc: 'VCP pivot + Dry Up + RMV≤15 + MA uptrend. Entry langsung.', color: 'border-yellow-500/30 bg-yellow-950/20' },
                  { tab: '🏆 VCP Dry-Up', priority: 'TINGGI', desc: 'VCP + volume kering. Kemungkinan entry hari ini-besok.', color: 'border-orange-500/30 bg-orange-950/20' },
                  { tab: '🧊 VCP Iceberg', priority: 'TINGGI', desc: 'Akumulasi tersembunyi di VCP base. Entry sebelum breakout.', color: 'border-cyan-500/30 bg-cyan-950/20' },
                  { tab: '📉 VCP Base', priority: 'MEDIUM', desc: 'Base forming, belum ideal. Monitor, siapkan pemasangan order.', color: 'border-blue-500/30 bg-blue-950/20' },
                  { tab: '🥷 Dry Up', priority: 'MEDIUM', desc: 'Support test saja. Masuk konservatif dengan SL ketat.', color: 'border-gray-500/30 bg-gray-950/20' },
                ].map(t => (
                  <div key={t.tab} className={`rounded-lg p-2 border ${t.color} flex gap-2`}>
                    <div className="flex-1">
                      <div className="font-bold text-white">{t.tab}</div>
                      <div className="text-gray-400 leading-relaxed">{t.desc}</div>
                    </div>
                    <Pill color="bg-purple-900 text-purple-200">{t.priority}</Pill>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-3 text-xs text-gray-300">
            <strong className="text-purple-300">Kapan menggunakan VCP Screener?</strong> Setelah jam tutup pasar (16:00 WIB) atau sebelum open (08:00–08:55 WIB). Cari saham dengan Score 80+ dan CPP BULLISH untuk entry hari berikutnya.
          </div>
        </Section>

        {/* ── 7. SWING SCREENER ── */}
        <Section id="swing-screener" icon={<IconTrend />} title="7. Swing Screener — Momentum Lanjutan" color="bg-gradient-to-r from-emerald-900 to-green-900">
          <p className="text-sm text-gray-300 leading-relaxed">
            Swing Screener (Short Swing) mencari saham yang <strong className="text-white">sudah naik 5%+ dari base</strong> kemudian masuk fase <strong className="text-white">cooldown dengan volume jual rendah</strong> dan masih memiliki daya untuk lanjut naik. Cocok untuk <strong className="text-white">1–5 hari holding</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-emerald-300 text-sm mb-2">Kriteria yang dicari:</h4>
              <div className="space-y-1 text-xs text-gray-400">
                {[
                  'Naik ≥ 5% dari titik terendah 20 hari lalu',
                  'Masuk fase cooldown (candle mengecil, vol turun)',
                  'Volume jual ≤ 30% dari total — supply sangat lemah',
                  'CPP positif — momentum masih ada',
                  'Accumulation ratio ≥ 1.2 (beli lebih dominan dari jual)',
                  'Power Score ≥ 60',
                  'Di atas atau dekat MA20',
                ].map((c, i) => (
                  <div key={i} className="flex items-start gap-2"><IconCheck /><span>{c}</span></div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-emerald-300 text-sm mb-2">Grade hasil:</h4>
              <div className="space-y-2 text-xs">
                {[
                  { grade: 'A+', color: 'bg-yellow-900 border-yellow-500 text-yellow-300', desc: 'Sniper/Breakout. Semua kriteria sempurna. Entry langsung.' },
                  { grade: 'A', color: 'bg-green-900 border-green-500 text-green-300', desc: 'Setup kuat. CPP bullish + vol jual rendah. Entry hari ini.' },
                  { grade: 'B', color: 'bg-blue-900 border-blue-500 text-blue-300', desc: 'Setup cukup baik. Monitor dan masuk jika ada konfirmasi candle hijau.' },
                ].map(g => (
                  <div key={g.grade} className={`rounded-lg p-2 border ${g.color}`}>
                    <div className="font-bold">Grade {g.grade}</div>
                    <div className="text-gray-400">{g.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 text-xs text-gray-300">
            <strong className="text-emerald-300">Perbedaan Swing vs VCP:</strong> VCP = saham belum bergerak, sedang building base. Swing = saham sudah naik 5%+, istirahat sebentar, lanjut naik. VCP lebih aman tapi perlu lebih sabar. Swing lebih agresif tapi sudah ada momentum.
          </div>
        </Section>

        {/* ── 8. SCALP SCREENER ── */}
        <Section id="scalp-screener" icon={<IconBolt />} title="8. Scalp Screener — Momentum Intraday" color="bg-gradient-to-r from-yellow-900 to-amber-900">
          <p className="text-sm text-gray-300 leading-relaxed">
            Scalp Screener menganalisis candle 5m dan 15m untuk menemukan saham yang <strong className="text-white">sedang dalam fase markup agresif</strong>, lalu cooldown dengan selling volume rendah, dan masih punya power untuk <strong className="text-white">markup lagi dalam jam yang sama</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-yellow-300 text-sm mb-2">Cara Pakai:</h4>
              <div className="space-y-2">
                <StepBox step="1" title="Pilih Timeframe: 5m atau 15m" desc="5m = lebih banyak sinyal, noise lebih tinggi. 15m = lebih sedikit tapi lebih akurat." />
                <StepBox step="2" title="Pilih Filter: Liquid atau All" desc="Liquid wajib untuk scalping — hanya saham dengan volume intraday cukup." />
                <StepBox step="3" title="Klik Scan" desc="Scanning dilakukan secara realtime. Lebih baik scan saat market buka (09:00-15:45 WIB)." />
                <StepBox step="4" title="Cari Grade A+" desc="Grade A+ = setup paling kuat. Run ≥5%, sell vol rendah, CPP bullish, Power ≥75." />
                <StepBox step="5" title="Klik View Chart / Deep Analysis" desc="Chart otomatis tampil dengan timeframe yang digunakan screener." />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-300 text-sm mb-2">Kriteria yang dicari:</h4>
              <div className="space-y-1 text-xs text-gray-400">
                {[
                  'Run gain ≥ 3-5% dari base intraday',
                  'Cooldown sudah ≥2 candle — tidak sedang markup aktif',
                  'Sell volume ratio ≤ 20% — hampir tidak ada penjual',
                  'CPP bullish — momentum masih ada',
                  'Power Score ≥ 70 — candle kuat',
                  'RMV ≤ 30 — volatilitas mulai menyempit',
                  'Accumulation ratio ≥ 1.3',
                ].map((c, i) => (
                  <div key={i} className="flex items-start gap-2"><IconCheck /><span>{c}</span></div>
                ))}
              </div>
              <div className="mt-3 bg-yellow-950/30 border border-yellow-500/20 rounded-lg p-2 text-xs text-gray-300">
                <strong className="text-yellow-300">Waktu terbaik:</strong> 09:15–10:30 WIB (opening momentum) dan 13:30–15:30 WIB (afternoon push). Hindari 11:30–13:00 (istirahat, volume kering).
              </div>
            </div>
          </div>
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-xs text-gray-300">
            <strong className="text-amber-300">Perbedaan Scalp vs Swing:</strong> Scalp menggunakan 5m/15m — target profit 2-5% dalam jam yang sama. Swing menggunakan 1D — target 5-15% dalam 1-5 hari. Scalp butuh disiplin cut loss ketat (≤1%) karena leverage waktu.
          </div>
        </Section>

        {/* ── 9. ANALYSIS ── */}
        <Section id="analysis" icon={<IconBrain />} title="9. Analysis Page — Analisis Mendalam" color="bg-gradient-to-r from-violet-900 to-purple-900">
          <p className="text-sm text-gray-300 leading-relaxed">
            Halaman Analysis memberikan <strong className="text-white">analisis komprehensif satu saham</strong> dengan output rekomendasi BUY/WAIT/SELL/WATCH disertai alasan, level Stop Loss, dan Target Profit.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-violet-300 text-sm mb-2">Cara Pakai:</h4>
              <div className="space-y-2">
                <StepBox step="1" title="Ketik kode saham" desc="Masukkan kode tanpa .JK. Klik Analyze." />
                <StepBox step="2" title="Baca Wyckoff Phase" desc="MARKUP = aman beli. ACCUMULATION = persiapkan entry. MARKDOWN = hindari." />
                <StepBox step="3" title="Baca VSA Signal" desc="SOS = Sign of Strength (beli). SOW = Sign of Weakness (jual). NS = No Supply (beli)." />
                <StepBox step="4" title="Cek CPP & Power" desc="CPP bullish + Power ≥70 = konfirmasi entry. CPP bearish = tunda." />
                <StepBox step="5" title="Baca Rekomendasi" desc="BUY/WAIT/SELL/WATCH dengan confidence score dan alasan detail." />
                <StepBox step="6" title="Gunakan SL & TP" desc="Stop Loss dan Target Profit sudah dihitung otomatis. Pastikan R:R ≥ 1.5x." />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-violet-300 text-sm mb-2">Output Rekomendasi:</h4>
              <div className="space-y-2 text-xs">
                {[
                  { rec: 'BUY 🟢', conf: '≥70%', desc: 'Setup bullish kuat. Entry sekarang atau besok pagi.', color: 'border-green-500/30 bg-green-950/20 text-green-300' },
                  { rec: 'WATCH 🔵', conf: '50–70%', desc: 'Setup developing. Pantau, tunggu konfirmasi candle.', color: 'border-blue-500/30 bg-blue-950/20 text-blue-300' },
                  { rec: 'WAIT ⏳', conf: '30–50%', desc: 'Belum ideal. Tunggu struktur yang lebih jelas.', color: 'border-yellow-500/30 bg-yellow-950/20 text-yellow-300' },
                  { rec: 'SELL 🔴', conf: 'Negatif', desc: 'Distribusi aktif atau breakdown. Kurangi/exit posisi.', color: 'border-red-500/30 bg-red-950/20 text-red-300' },
                ].map(r => (
                  <div key={r.rec} className={`rounded-lg p-2 border ${r.color}`}>
                    <div className="flex justify-between">
                      <span className="font-bold">{r.rec}</span>
                      <span className="text-gray-500">Confidence {r.conf}</span>
                    </div>
                    <div className="text-gray-400 mt-0.5">{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── 10. WHICH TO USE ── */}
        <Section id="which-to-use" icon={<IconSearch />} title="10. Mana yang Harus Dipilih?" color="bg-gradient-to-r from-slate-800 to-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left p-3 text-gray-400">Tujuan Kamu</th>
                  <th className="text-left p-3 text-gray-400">Fitur yang Tepat</th>
                  <th className="text-left p-3 text-gray-400">Timeframe Holding</th>
                  <th className="text-left p-3 text-gray-400">Risiko</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { goal: 'Cari saham untuk trading harian (scalp)', feature: 'Scalp Screener (5m/15m)', hold: 'Menit–Jam', risk: '🔴 Tinggi' },
                  { goal: 'Cari saham momentum lanjutan (1-5 hari)', feature: 'Swing Screener (1D)', hold: '1–5 hari', risk: '🟡 Sedang' },
                  { goal: 'Cari setup VCP sebelum breakout', feature: 'VCP Screener (1D)', hold: '1–4 minggu', risk: '🟢 Rendah-Sedang' },
                  { goal: 'Analisis saham tertentu sebelum beli', feature: 'Analysis Page', hold: 'Sesuai timeframe', risk: '🔵 Tergantung setup' },
                  { goal: 'Lihat chart detail + indikator', feature: 'Chart (1D default)', hold: 'Fleksibel', risk: '🔵 Tergantung trader' },
                  { goal: 'Konfirmasi setelah screener', feature: 'Chart → Analysis', hold: 'Setelah screener', risk: '🟢 Lebih aman' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/5 transition">
                    <td className="p-3 text-gray-300">{row.goal}</td>
                    <td className="p-3 font-semibold text-cyan-300">{row.feature}</td>
                    <td className="p-3 text-gray-400">{row.hold}</td>
                    <td className="p-3">{row.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Decision tree */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="font-semibold text-white text-sm">Decision Tree — Langkah Cepat</div>
            <div className="space-y-2 text-xs">
              {[
                { q: 'Ingin profit hari ini (intraday)?', a: 'Gunakan Scalp Screener → pilih 15m → Grade A+ → View Chart', color: 'text-yellow-300' },
                { q: 'Ingin swing 1-5 hari tanpa pantau terus?', a: 'Gunakan Swing Screener → Grade A/A+ → Konfirmasi di Analysis → Set SL/TP', color: 'text-green-300' },
                { q: 'Ingin cari saham sebelum breakout besar?', a: 'Gunakan VCP Screener → Tab Sniper → Score ≥80 → Beli besok pagi', color: 'text-purple-300' },
                { q: 'Punya saham tertentu, ingin tahu should buy?', a: 'Langsung ke Analysis Page → Input kode → Baca BUY/WAIT/SELL', color: 'text-blue-300' },
                { q: 'Ingin cek chart setelah screener?', a: 'Klik View Chart dari screener → Aktifkan VSA + Power Candle → Cek S/R', color: 'text-cyan-300' },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400">{i + 1}</div>
                  <div>
                    <div className="font-semibold text-gray-300">{item.q}</div>
                    <div className={`mt-0.5 ${item.color}`}>{item.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 11. ENTRY GUIDE ── */}
        <Section id="entry-guide" icon={<IconTarget />} title="11. Kapan Entry — Panduan Praktis" color="bg-gradient-to-r from-green-900 to-emerald-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Perfect entry */}
            <div className="space-y-3">
              <h4 className="font-semibold text-green-300 text-sm">✅ Kondisi Entry Ideal (Semua harus terpenuhi)</h4>
              <div className="space-y-2 text-xs text-gray-400">
                {[
                  { label: 'Wyckoff Phase', check: 'ACCUMULATION atau MARKUP' },
                  { label: 'VSA Signal', check: 'No Supply (NS), Selling Climax (SC), atau VCP Dry-Up' },
                  { label: 'CPP Bias', check: 'BULLISH (CPP &gt; +0.5)' },
                  { label: 'Candle Power', check: '≥ 70 pada last 3 candle' },
                  { label: 'Posisi MA', check: 'Di atas MA20, idealnya juga MA50' },
                  { label: 'Volume', check: 'Dry Up (≤0.6×) atau Iceberg (tinggi+spread sempit)' },
                  { label: 'R:R Ratio', check: 'Target ≥ 1.5× Stop Loss (R:R ≥ 1.5x)' },
                ].map(c => (
                  <div key={c.label} className="flex gap-2 items-start">
                    <span className="text-green-400 mt-0.5 flex-shrink-0"><IconCheck /></span>
                    <div><span className="font-semibold text-gray-300">{c.label}: </span>{c.check}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Entry timing */}
            <div className="space-y-3">
              <h4 className="font-semibold text-green-300 text-sm">⏰ Timing Entry</h4>
              <div className="space-y-2 text-xs">
                {[
                  { time: 'Swing (1D)', when: 'Beli setelah closing (16:00–16:30 WIB) jika sinyal konfluens. Atau beli saat pre-opening besok (09:00–09:10 WIB).', color: 'border-blue-500/30' },
                  { time: 'Scalp (15m)', when: 'Beli saat candle 15m pertama/kedua setelah cooldown selesai dan vol mulai naik kembali.', color: 'border-yellow-500/30' },
                  { time: 'Scalp (5m)', when: 'Beli saat breakout candle 5m dari level resistance terdekat dengan volume konfirmasi.', color: 'border-orange-500/30' },
                ].map(t => (
                  <div key={t.time} className={`rounded-lg p-3 border ${t.color} bg-white/5`}>
                    <div className="font-bold text-white">{t.time}</div>
                    <div className="text-gray-400 mt-1 leading-relaxed">{t.when}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Don't entry when */}
            <div className="space-y-3">
              <h4 className="font-semibold text-red-300 text-sm">❌ JANGAN Entry jika:</h4>
              <div className="space-y-1 text-xs text-gray-400">
                {[
                  'Wyckoff Phase DISTRIBUTION atau MARKDOWN',
                  'VSA: Up-Thrust, Buying Climax, atau No Demand',
                  'CPP BEARISH (CPP < -0.5)',
                  'Candle Power < 40 pada last candle',
                  'Harga jauh di bawah MA20 dan MA50',
                  'Volume distribusi tinggi (accRatio < 0.5)',
                  'Tidak ada Stop Loss yang jelas (R:R < 1)',
                  'Saat market sedang sentimen negatif makro (IHSG -2%+)',
                ].map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-red-400">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                    <span className="text-gray-400">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <h4 className="font-semibold text-yellow-300 text-sm">📋 Pre-Entry Checklist</h4>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-2 text-gray-400">
                {[
                  '[ ] Cek Phase Wyckoff di Analysis Page',
                  '[ ] Lihat VSA Signal di Chart (aktifkan tombol VSA Pattern)',
                  '[ ] Cek CPP di Legend panel (harus BULLISH)',
                  '[ ] Cek Candle Power ≥ 70 (titik hijau di candle)',
                  '[ ] Konfirmasi harga di atas MA20',
                  '[ ] Set Stop Loss di bawah support terdekat',
                  '[ ] Hitung R:R — pastikan ≥ 1.5x',
                  '[ ] Tentukan ukuran posisi (max 5-10% portofolio per trade)',
                ].map((c, i) => (
                  <div key={i} className="font-mono">{c}</div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── 12. RISK MANAGEMENT ── */}
        <Section id="risk" icon={<IconShield />} title="12. Risk Management — Wajib Dibaca!" color="bg-gradient-to-r from-red-900 to-rose-900">
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-xs text-red-200 leading-relaxed mb-4">
            <strong className="text-red-300 flex items-center gap-2 mb-1"><IconWarning /> DISCLAIMER PENTING</strong>
            Platform ini adalah <strong>alat bantu analisis teknikal</strong>, bukan nasihat investasi. Semua keputusan trading adalah tanggung jawab penuh trader. Pasar saham memiliki risiko kerugian. Tidak ada sinyal yang 100% akurat.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Stop Loss Wajib',
                color: 'border-red-500/30',
                items: [
                  'Swing: SL di bawah support MA20 atau swing low terdekat (~3-5%)',
                  'Scalp: SL ketat ~0.5-1% dari entry',
                  'VCP: SL di bawah pivot low',
                  'Jangan pernah trade tanpa SL',
                ]
              },
              {
                title: 'Position Sizing',
                color: 'border-yellow-500/30',
                items: [
                  'Max 5-10% portofolio per trade untuk scalp',
                  'Max 10-20% portofolio per swing',
                  'Jangan all-in satu saham',
                  'Diversifikasi 3-5 saham berbeda sektor',
                ]
              },
              {
                title: 'R:R Ratio',
                color: 'border-green-500/30',
                items: [
                  'Minimum R:R 1.5x (risiko 1, target 1.5)',
                  'Ideal R:R 2x-3x untuk swing',
                  'Scalp bisa R:R 1.2x dengan win rate tinggi',
                  'Jangan masuk jika TP tidak masuk akal',
                ]
              },
              {
                title: 'Cut Loss Disiplin',
                color: 'border-orange-500/30',
                items: [
                  'Jika SL kena, cut tanpa ragu',
                  'Jangan averaging down saham yang breakdown',
                  'Loss 1% per trade = aman. Loss 5-10% = berbahaya',
                  'Protect capital lebih penting dari profit',
                ]
              },
              {
                title: 'Kapan Profit Taking',
                color: 'border-cyan-500/30',
                items: [
                  'Partial TP di 50% target (amankan setengah profit)',
                  'Trail SL setelah profit 3%+',
                  'Jual jika VSA muncul Distribusi atau Upthrust',
                  'Jual jika candle breakdown MA20 dengan volume tinggi',
                ]
              },
              {
                title: 'Psikologi Trading',
                color: 'border-violet-500/30',
                items: [
                  'Jangan FOMO masuk saat harga sudah naik >10%',
                  'Jangan hold saat ada sinyal distribusi jelas',
                  'Tidak ada sinyal 100% akurat — terima probabilitas',
                  'Fokus pada proses, bukan hasil tiap trade',
                ]
              },
            ].map(card => (
              <div key={card.title} className={`bg-white/5 border ${card.color} rounded-xl p-3 space-y-2`}>
                <div className="font-semibold text-white text-sm flex items-center gap-2"><IconShield />{card.title}</div>
                <ul className="space-y-1 text-xs text-gray-400">
                  {card.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gray-500 mt-0.5 flex-shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Quick formula */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="font-semibold text-white text-sm">📐 Formula Cepat</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-gray-500 mb-1">R:R Ratio</div>
                <div className="text-cyan-300">(Target - Entry) / (Entry - SL)</div>
                <div className="text-gray-500 mt-1">Harus ≥ 1.5</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-gray-500 mb-1">Lot Size (Swing)</div>
                <div className="text-green-300">Modal × 15% / Entry Price</div>
                <div className="text-gray-500 mt-1">Max 15% per trade</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-gray-500 mb-1">Max Loss per Trade</div>
                <div className="text-red-300">Modal Total × 1-2%</div>
                <div className="text-gray-500 mt-1">Daily max loss 3-5%</div>
              </div>
            </div>
          </div>
        </Section>

        {/* Quick Links Footer */}
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-4 md:p-6">
          <div className="text-center mb-4">
            <h3 className="font-bold text-lg text-white">Mulai Trading Sekarang</h3>
            <p className="text-xs text-gray-400 mt-1">Pilih fitur yang sesuai dengan strategi kamu</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { href: '/', label: 'Chart', icon: '📊', color: 'bg-blue-600/30 border-blue-500/40 hover:bg-blue-600/50' },
              { href: '/analysis', label: 'Analysis', icon: '🧠', color: 'bg-violet-600/30 border-violet-500/40 hover:bg-violet-600/50' },
              { href: '/vcp-screener', label: 'VCP Screener', icon: '🎯', color: 'bg-purple-600/30 border-purple-500/40 hover:bg-purple-600/50' },
              { href: '/swing-screener', label: 'Swing Screener', icon: '📈', color: 'bg-emerald-600/30 border-emerald-500/40 hover:bg-emerald-600/50' },
              { href: '/scalp-screener', label: 'Scalp Screener', icon: '⚡', color: 'bg-yellow-600/30 border-yellow-500/40 hover:bg-yellow-600/50' },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className={`backdrop-blur-md border ${link.color} rounded-xl p-3 text-center transition block`}>
                <div className="text-2xl mb-1">{link.icon}</div>
                <div className="font-semibold text-white text-xs md:text-sm">{link.label}</div>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 pb-4">
          Ebite Chart v2 — Powered by Yahoo Finance • Wyckoff • VSA • VCP • Lightweight Charts
        </p>
      </div>
    </div>
  );
}

