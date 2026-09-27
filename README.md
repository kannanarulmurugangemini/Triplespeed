# Triplespeed Web Application

This repository contains the Triplespeed web application, converted and configured from static Next.js production assets into a fully functional, self-hosted web application.

---

## 1. Codebase Analysis

### Origin & Architecture
- **Framework**: Next.js (React 18 Pages Router) with Tailwind CSS styling and custom typography (`VCR OSD Mono`).
- **Core Pages**:
  - `/` (`index.html`) - Main landing page with retro CRT monitor effects, interactive cursor canvas, background video, and instrumental audio player.
  - `/about` - About the company and operating model.
  - `/careers` - Job listings with direct application links.
  - `/faq` - Frequently asked questions.
  - `/contact` - Social handles and contact points.
- **Media & Assets**:
  - `videos/background.mp4` (~48 MB): High-definition loop streamed with HTTP Range support (`206 Partial Content`).
  - `music/background-track.mp3` (~9.8 MB): Background audio track (Kanye West - POWER Instrumental).
  - `fonts/vcr-osd-mono.woff2`: Custom retro monospace font.
  - `_next/static/`: Production Webpack chunks, React runtime, and compiled Tailwind CSS.

### Key Fixes Implemented for Web Hosting
1. **Dynamic Image Resolution**: Next.js uses an image optimization endpoint (`/_next/image?url=...`). The custom server resolves these requests directly to high-resolution assets (`images/camera-overlay.png` and `images/triplespeed-logo-white.png`), eliminating 404s.
2. **Clean Route Mapping**: Fixed extensionless routing so that `/about`, `/careers`, `/contact`, and `/faq` serve `text/html; charset=utf-8` without requiring `.html` in the URL.
3. **HTTP Range Streaming**: Enabled chunked byte-range requests for smooth playback of the 48MB background video and audio track.
4. **Base Tag Navigation**: Injected `<base href="/" />` so that relative assets and navigation links work consistently regardless of routing depth.
5. **Code & File Upload Endpoint**: Added an `/api/upload` endpoint and a dedicated retro UI at `/upload` to accept files and source code.

---

## 2. Running Locally

### Option A: Direct with Node.js (Zero Dependencies)
```bash
# Start server (default: port 3000)
npm start
# or
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option B: Development Mode (Auto-reload on changes)
```bash
npm run dev
```

### Option C: Docker / Container
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or with standalone Docker
docker build -t triplespeed-web .
docker run -p 3000:3000 triplespeed-web
```

---

## 3. Hosting & Deployment Options

### Deploy to Vercel
Configuration is pre-set in `vercel.json`:
```bash
npx vercel
```

### Deploy to Netlify
Configuration is pre-set in `netlify.toml`:
```bash
npx netlify deploy --prod
```

### Deploy to Firebase Hosting
Configuration is pre-set in `firebase.json`:
```bash
firebase deploy --only hosting
```

### Deploy to Cloud Run / Render / Railway / VPS
Use the included `Dockerfile`:
- **Render / Railway**: Select "Deploy from Dockerfile" or "Node.js Service" (Run Command: `node server.js`).
- **Google Cloud Run**: `gcloud run deploy triplespeed --source .`

---

## 4. Code & File Uploading

### Can I upload code?
**Yes!** There are 3 ways depending on what you wish to do:

1. **Upload Files Directly via the Web App**:
   - Visit [http://localhost:3000/upload](http://localhost:3000/upload) in your browser.
   - Drag & drop your code, ZIP archives, or assets. Files are saved into the `uploads/` directory.
   - Or use the API:
     ```bash
     curl -X POST http://localhost:3000/api/upload \
       -H "x-filename: my_code.js" \
       -d "console.log('custom code');"
     ```

2. **Upload / Push to GitHub or a Git Remote**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Triplespeed web application"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

3. **Upload Files into this Workspace**:
   - You can copy or upload files directly into this directory (`/home/dhonnai/Triplespeed/Triplespeed`) using your IDE or terminal.
