const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://agentic-540e8819.vercel.app';

export default async function handler(req, res) {
  try {
    if (!TELEGRAM_TOKEN) {
      res.status(400).json({ error: 'Missing TELEGRAM_BOT_TOKEN' });
      return;
    }
    const webhookUrl = `${BASE_URL}/api/telegram/webhook`;
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, max_connections: 40, allowed_updates: ["message", "callback_query"] }),
    });
    const json = await resp.json();
    res.status(200).json(json);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set webhook', details: String(err) });
  }
}
