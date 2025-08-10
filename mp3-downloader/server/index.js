const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const ytsr = require('ytsr');
const ytdl = require('ytdl-core');
const sanitize = require('sanitize-filename');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static');
const { Readable } = require('stream');

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath && ffprobePath.path) {
  ffmpeg.setFfprobePath(ffprobePath.path);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/search', async (req, res) => {
  try {
    const query = (req.query.q || '').toString().trim();
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }

    const searchResults = await ytsr(query, { limit: 24 });
    const items = (searchResults.items || [])
      .filter((i) => i.type === 'video')
      .map((v) => ({
        id: v.id,
        title: v.title,
        duration: v.duration,
        views: v.views,
        uploadedAt: v.uploadedAt,
        url: v.url,
        author: v.author ? { name: v.author.name, url: v.author.url } : null,
        thumbnails: v.thumbnails,
      }));

    res.json({ items });
  } catch (err) {
    console.error('Search error', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

function parseTimeToSeconds(value) {
  if (!value) return null;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  const parts = value.split(':').map(Number);
  if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    return hh * 3600 + mm * 60 + ss;
  }
  if (parts.length === 2) {
    const [mm, ss] = parts;
    return mm * 60 + ss;
  }
  return null;
}

app.get('/api/convert', async (req, res) => {
  try {
    const videoId = (req.query.id || '').toString();
    if (!videoId || !ytdl.validateID(videoId)) {
      return res.status(400).json({ error: 'Invalid or missing video id' });
    }

    const bitrateParam = parseInt((req.query.bitrate || '192').toString(), 10);
    const supportedBitrates = [128, 192, 256, 320];
    const bitrate = supportedBitrates.includes(bitrateParam) ? bitrateParam : 192;

    const startSec = parseTimeToSeconds(req.query.start && req.query.start.toString());
    const endSec = parseTimeToSeconds(req.query.end && req.query.end.toString());

    const info = await ytdl.getInfo(videoId);
    const details = info.videoDetails;
    const title = sanitize(`${details.title}`);
    const artist = details.author?.name || 'Unknown Artist';
    const coverUrl = details.thumbnails && details.thumbnails.length > 0
      ? details.thumbnails[details.thumbnails.length - 1].url
      : null;

    const filename = sanitize(`${title} (${bitrate}kbps).mp3`) || `audio-${videoId}.mp3`;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const audioStream = ytdl(videoId, {
      quality: 'highestaudio',
      filter: 'audioonly',
      highWaterMark: 1 << 25,
    });

    let command = ffmpeg(audioStream)
      .audioCodec('libmp3lame')
      .audioBitrate(bitrate)
      .format('mp3')
      .outputOptions([
        '-id3v2_version', '3',
        '-metadata', `title=${title}`,
        '-metadata', `artist=${artist}`,
        '-metadata', `comment=Downloaded via MP3 Downloader`,
      ]);

    if (startSec != null && endSec != null && endSec > startSec) {
      command = command.setStartTime(startSec).setDuration(endSec - startSec);
    } else if (startSec != null) {
      command = command.setStartTime(startSec);
    }

    if (coverUrl) {
      try {
        const resp = await fetch(coverUrl);
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          const coverStream = Readable.from(buf);
          command = command.addInput(coverStream).inputFormat('image2')
            .outputOptions([
              '-map', '0:a',
              '-map', '1:v',
              '-c:v', 'mjpeg',
              '-metadata:s:v', 'title=Album cover',
              '-metadata:s:v', 'comment=Cover (front)'
            ]);
        }
      } catch (e) {
        console.warn('Cover fetch failed', e.message);
      }
    }

    command.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Transcoding failed' });
      }
      try { audioStream.destroy(); } catch {}
    });

    command.on('start', (cmdline) => {
      console.log('FFmpeg started:', cmdline);
    });

    command.on('end', () => {
      console.log('Transcoding complete for', videoId);
    });

    command.pipe(res, { end: true });
  } catch (err) {
    console.error('Convert error', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Conversion failed' });
    }
  }
});

// Serve static frontend
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
// Catch-all for client-side routing, excluding API routes
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});