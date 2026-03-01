// ============================================================================
// EBITE CHART — Telegram Bot Webhook Route
// POST /api/telegram  — receives updates from Telegram
// GET  /api/telegram  — set/check webhook
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate, isAlreadyProcessed } from '../../../lib/telegram-bot';

// Allow up to 60s execution on Vercel Pro plan
export const maxDuration = 60;

// Force Node.js runtime (not Edge) so we have full Node APIs
export const runtime = 'nodejs';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8605664472:AAGUfoi3Toe89UaJMFAfEL9afE7lp6H6e6s';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── POST: Receive updates from Telegram ───────────────────────────────────
// Returns 200 immediately, processes the update in the background.
// This prevents Telegram from retrying (it does so if no 200 within 5s)
// and avoids Vercel serverless timeout for heavy commands.
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 200 });
  }

  // Deduplicate — Telegram retries same update_id if no 200 quickly
  const updateId: number = body?.update_id;
  if (updateId && isAlreadyProcessed(updateId)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Fire-and-forget: process the update asynchronously.
  // On Vercel, use the built-in waitUntil from the request context if available,
  // otherwise just fire (the response is already sent, Vercel keeps the function
  // alive for pending promises in Node.js runtime).
  const processPromise = handleTelegramUpdate(body).catch((err: Error) => {
    console.error('Telegram background handler error:', err.message);
  });

  // Next.js 15 supports after() for background work after response
  try {
    // Dynamic import to avoid build errors on older Next.js versions
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { after } = require('next/server');
    if (typeof after === 'function') {
      after(processPromise);
    }
  } catch {
    // after() not available — the promise still runs in Node.js runtime
    // as long as we don't explicitly kill it
  }

  // Always return 200 immediately to Telegram
  return NextResponse.json({ ok: true });
}

// ── GET: Register webhook or get bot info ─────────────────────────────────
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action') || 'info';

  try {
    if (action === 'set-webhook') {
      // Set webhook to this deployment URL
      const webhookUrl = searchParams.get('url');
      if (!webhookUrl) {
        return NextResponse.json({ error: 'Missing ?url= parameter' }, { status: 400 });
      }
      const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'edited_message'],
          drop_pending_updates: true,
        }),
      });
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'delete-webhook') {
      const res = await fetch(`${TELEGRAM_API}/deleteWebhook`, { method: 'POST' });
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'set-commands') {
      // Register bot commands with Telegram (shows menu in clients)
      const res = await fetch(`${TELEGRAM_API}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'analisa', description: 'Analisis lengkap (RF + Candle Power + VSA) — contoh: /analisa BBCA' },
            { command: 'besok',   description: 'Prediksi candle besok — contoh: /besok TLKM' },
            { command: 'rf',      description: 'Ryan Filbert + Stan Weinstein — contoh: /rf BMRI' },
            { command: 'cek',     description: 'Analisis mendalam Wyckoff + VCP + VSA — contoh: /cek ASII' },
            { command: 'bantuan', description: 'Tampilkan daftar perintah & panduan' },
            { command: 'start',   description: 'Mulai bot & lihat panduan lengkap' },
          ],
        }),
      });
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Default: get webhook info
    const [webhookRes, meRes] = await Promise.all([
      fetch(`${TELEGRAM_API}/getWebhookInfo`),
      fetch(`${TELEGRAM_API}/getMe`),
    ]);
    const webhookData = await webhookRes.json();
    const meData = await meRes.json();

    return NextResponse.json({
      bot: meData.result,
      webhook: webhookData.result,
      usage: {
        'set-webhook': `GET /api/telegram?action=set-webhook&url=https://YOUR_DOMAIN/api/telegram`,
        'delete-webhook': 'GET /api/telegram?action=delete-webhook',
        'set-commands': 'GET /api/telegram?action=set-commands',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

