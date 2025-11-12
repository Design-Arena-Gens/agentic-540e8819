import ytdl from 'ytdl-core';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import sanitize from 'sanitize-filename';

export const config = {
  api: {
    responseLimit: false,
    bodyParser: false,
  },
};

function formatDuration(seconds) {
  const s = Number(seconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const parts = [];
  if (h > 0) parts.push(String(h).padStart(2, '0'));
  parts.push(String(m).padStart(2, '0'));
  parts.push(String(sec).padStart(2, '0'));
  return parts.join(':');
}

export default async function handler(req, res) {
  try {
    const { url, videoId, bitrate } = req.query;
    const targetUrl = url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);
    if (!targetUrl) {
      res.status(400).json({ error: 'Missing url or videoId' });
      return;
    }

    const info = await ytdl.getInfo(targetUrl);
    const title = sanitize(info.videoDetails.title || 'audio');
    const lengthSeconds = Number(info.videoDetails.lengthSeconds || 0);

    const maxSeconds = Number(process.env.MAX_VIDEO_SECONDS || 60 * 30); // default 30 minutes
    if (lengthSeconds > maxSeconds) {
      res.status(413).json({
        error: 'Video too long',
        maxSeconds,
        length: lengthSeconds,
        duration: formatDuration(lengthSeconds),
      });
      return;
    }

    const kbps = Math.min(Math.max(Number(bitrate) || 128, 64), 192);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, immutable');
    res.setHeader('Content-Disposition', `inline; filename="${title}.mp3"`);

    const audioStream = ytdl(targetUrl, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
    });

    // Init ffmpeg
    ffmpeg.setFfmpegPath(ffmpegPath);
    const command = ffmpeg(audioStream)
      .audioBitrate(kbps)
      .format('mp3')
      .on('error', (err) => {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Transcoding error', details: String(err) });
        } else {
          try { res.end(); } catch {}
        }
      })
      .on('end', () => {
        try { res.end(); } catch {}
      });

    command.pipe(res, { end: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request', details: String(err) });
  }
}
