// ============================================================================
// EBITE CHART — Telegram Bot Webhook Route
// POST /api/telegram  — receives updates from Telegram
// GET  /api/telegram  — set/check webhook
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate } from '../../../lib/telegram-bot';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8605664472:AAGUfoi3Toe89UaJMFAfEL9afE7lp6H6e6s';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── POST: Receive updates from Telegram ───────────────────────────────────
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    // Handle asynchronously so we return 200 immediately to Telegram
    handleTelegramUpdate(body).catch((err: any) =>
      console.error('Async Telegram update error:', err.message)
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram POST error:', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 }); // always 200 for Telegram
  }
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
            { command: 'rf',   description: 'Ryan Filbert analysis — contoh: /rf BBCA' },
            { command: 'cp',   description: 'Candle Power prediction — contoh: /cp TLKM' },
            { command: 'vcp',  description: 'VCP + Wyckoff + VSA — contoh: /vcp ASII' },
            { command: 'help', description: 'Tampilkan bantuan & daftar perintah' },
            { command: 'start','description': 'Mulai bot & lihat panduan' },
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

