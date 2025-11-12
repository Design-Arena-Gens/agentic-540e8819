export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial' }}>
      <h1>Telegram YouTube to MP3 Bot</h1>
      <p>Deploy complete. Use the Telegram bot with webhook pointed to this domain.</p>
      <ul>
        <li>Webhook: <code>/api/telegram/webhook</code></li>
        <li>Search API: <code>/api/yt/search?q=QUERY</code></li>
        <li>MP3 API: <code>/api/yt2mp3?url=YOUTUBE_URL</code></li>
      </ul>
    </main>
  );
}
