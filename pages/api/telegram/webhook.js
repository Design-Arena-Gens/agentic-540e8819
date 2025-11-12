import yts from 'yt-search';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://agentic-540e8819.vercel.app';

async function tg(method, body) {
  if (!TELEGRAM_TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN');
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  if (!json.ok) throw new Error(`Telegram error: ${resp.status} ${JSON.stringify(json)}`);
  return json.result;
}

function buildMp3Url(video) {
  const url = `${BASE_URL}/api/yt2mp3?videoId=${encodeURIComponent(video.videoId || video.id)}`;
  return url;
}

function formatList(videos) {
  return videos.map((v, i) => `${i + 1}. ${v.title} (${v.timestamp || v.duration?.timestamp || ''})`).join('\n');
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(200).json({ ok: true });
      return;
    }
    const update = req.body;

    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = (msg.text || '').trim();

      if (text.startsWith('/start')) {
        await tg('sendMessage', {
          chat_id: chatId,
          text: 'Send a YouTube link or use /search your query to get MP3. Example: /search lo-fi beats',
        });
      } else if (text.startsWith('/search') || text.startsWith('search ')) {
        const q = text.replace(/^\/?search\s*/i, '').trim();
        if (!q) {
          await tg('sendMessage', { chat_id: chatId, text: 'Usage: /search <query>' });
        } else {
          const results = await yts(q);
          const videos = (results.videos || []).slice(0, 5);
          if (videos.length === 0) {
            await tg('sendMessage', { chat_id: chatId, text: 'No results found.' });
          } else {
            const keyboard = {
              inline_keyboard: videos.map(v => [{ text: `MP3: ${v.title.substring(0, 40)}`, callback_data: `mp3 ${v.videoId}` }]),
            };
            await tg('sendMessage', {
              chat_id: chatId,
              text: `Top results for: ${q}\n\n${formatList(videos)}`,
              reply_markup: keyboard,
              disable_web_page_preview: true,
            });
          }
        }
      } else if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text)) {
        const url = text;
        await tg('sendMessage', { chat_id: chatId, text: 'Preparing MP3?' });
        const info = await yts({ videoId: null, query: url });
        const title = info?.all?.[0]?.title || 'Audio';
        const streamUrl = `${BASE_URL}/api/yt2mp3?url=${encodeURIComponent(url)}`;
        await tg('sendAudio', {
          chat_id: chatId,
          audio: streamUrl,
          title,
          caption: title,
        });
      } else if (text.toLowerCase().startsWith('mp3 ')) {
        const id = text.slice(4).trim();
        const streamUrl = `${BASE_URL}/api/yt2mp3?videoId=${encodeURIComponent(id)}`;
        await tg('sendAudio', { chat_id: chatId, audio: streamUrl });
      } else {
        await tg('sendMessage', { chat_id: chatId, text: 'Unknown input. Send a YouTube link or use /search <query>.' });
      }
    } else if (update.callback_query) {
      const q = update.callback_query;
      const chatId = q.message.chat.id;
      const data = q.data || '';
      if (data.startsWith('mp3 ')) {
        const id = data.slice(4).trim();
        const streamUrl = `${BASE_URL}/api/yt2mp3?videoId=${encodeURIComponent(id)}`;
        await tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Sending MP3?' });
        await tg('sendAudio', { chat_id: chatId, audio: streamUrl });
      } else {
        await tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Unsupported action' });
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    // Best-effort error reporting to Telegram if possible
    try {
      const update = req.body;
      const chatId = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
      if (chatId && process.env.TELEGRAM_BOT_TOKEN) {
        const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `Error: ${String(err).slice(0, 400)}` }) });
      }
    } catch {}
    res.status(200).json({ ok: true });
  }
}
