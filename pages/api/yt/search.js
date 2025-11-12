import yts from 'yt-search';

export default async function handler(req, res) {
  try {
    const { q, limit } = req.query;
    if (!q) {
      res.status(400).json({ error: 'Missing q' });
      return;
    }
    const max = Math.min(Math.max(Number(limit) || 5, 1), 10);
    const results = await yts(q);
    const videos = (results.videos || []).slice(0, max).map(v => ({
      id: v.videoId,
      title: v.title,
      url: v.url,
      author: v.author?.name,
      timestamp: v.timestamp,
      seconds: v.seconds,
    }));
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).json({ q, count: videos.length, videos });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: String(err) });
  }
}
