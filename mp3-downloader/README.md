## MP3 Downloader (YouTube Source)

A gorgeous, modern MP3 downloader inspired by MP3Juice — with selectable bitrates, optional clip trimming, embedded ID3 tags (title/artist/cover), QR share links, dark mode, and a clean UI.

### Features
- **YouTube search** without API keys
- **1-click MP3 convert** with selectable bitrate: 128, 192, 256, 320 kbps
- **Clip trimming**: choose start/end time (ss or mm:ss or hh:mm:ss)
- **ID3 tags**: embeds title, artist, and cover art when available
- **Shareable links**: QR code to share the direct download URL
- **Dark mode**: toggle theme, persistent
- **Responsive**: mobile-first, fast, Vite + React + Tailwind

### Screenshots
Add your screenshots here.

---

### Local Development

Requirements: Node.js 18+

```bash
# 1) Install dependencies
npm run setup

# 2) Start both dev servers (backend :3000, frontend :5173)
npm run dev

# Server dev: http://localhost:3000
# Client dev: http://localhost:5173
```

### Production Build

```bash
# Build client
npm run build

# Start server (serves static client from client/dist)
npm start
# -> http://localhost:3000
```

---

### Deploy to Render

This repo includes a `render.yaml` blueprint. Click to deploy:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/JackkySpice/Mp-3-Downloader/tree/main/mp3-downloader)

- The web service runs Node 18, builds the React client, and serves it via Express
- No database required

#### Environment
- `PORT` (optional, defaults to 3000)

---

### Notes
- For personal use only. Respect content rights and platform terms.
