const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'www.triplespeed.com');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8'
};

// Next.js dynamic image handler
function handleNextImage(parsedUrl, res) {
  const rawUrl = parsedUrl.searchParams.get('url') || '';
  const decodedUrl = decodeURIComponent(rawUrl);

  let targetFile = null;

  // 1. Direct match on full query string in _next folder
  const querySuffix = (parsedUrl.pathname + parsedUrl.search).replace(/^\/_next\//, '');
  const possibleDiskPath = path.join(PUBLIC_DIR, '_next', querySuffix);
  if (fs.existsSync(possibleDiskPath) && fs.statSync(possibleDiskPath).isFile()) {
    targetFile = possibleDiskPath;
  }

  // 2. Fallback to clean source images in images/
  if (!targetFile) {
    if (decodedUrl.includes('camera-overlay') || rawUrl.includes('camera-overlay')) {
      targetFile = path.join(PUBLIC_DIR, 'images', 'camera-overlay.png');
    } else if (decodedUrl.includes('triplespeed-logo-white') || rawUrl.includes('triplespeed-logo-white')) {
      targetFile = path.join(PUBLIC_DIR, 'images', 'triplespeed-logo-white.png');
    }
  }

  if (targetFile && fs.existsSync(targetFile)) {
    const stat = fs.statSync(targetFile);
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=31536000, immutable'
    });
    fs.createReadStream(targetFile).pipe(res);
    return true;
  }

  return false;
}

// Handle file upload API
function handleUpload(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    const buffer = Buffer.concat(body);

    if (boundaryMatch) {
      const boundary = boundaryMatch[1] || boundaryMatch[2];
      const parts = splitMultipart(buffer, boundary);
      const savedFiles = [];

      for (const part of parts) {
        if (part.filename) {
          const safeName = path.basename(part.filename).replace(/[^a-zA-Z0-9._-]/g, '_');
          const destPath = path.join(UPLOADS_DIR, safeName);
          fs.writeFileSync(destPath, part.data);
          savedFiles.push({ filename: safeName, size: part.data.length });
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        message: 'Code/files uploaded successfully',
        files: savedFiles
      }));
    } else {
      // Raw upload with custom filename header
      const originalName = req.headers['x-filename'] || `upload-${Date.now()}.code`;
      const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const destPath = path.join(UPLOADS_DIR, safeName);
      fs.writeFileSync(destPath, buffer);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        message: 'File uploaded successfully',
        filename: safeName,
        size: buffer.length
      }));
    }
  });
}

function splitMultipart(buffer, boundary) {
  const boundaryBuf = Buffer.from('--' + boundary);
  const parts = [];
  let start = 0;

  while ((start = buffer.indexOf(boundaryBuf, start)) !== -1) {
    start += boundaryBuf.length;
    if (buffer.slice(start, start + 2).toString() === '--') break;
    if (buffer.slice(start, start + 2).toString() === '\r\n') start += 2;

    const next = buffer.indexOf(boundaryBuf, start);
    if (next === -1) break;

    const partBuf = buffer.slice(start, next - 2);
    const headerEnd = partBuf.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const headers = partBuf.slice(0, headerEnd).toString('utf-8');
      const data = partBuf.slice(headerEnd + 4);
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : null;
      parts.push({ headers, filename, data });
    }
    start = next;
  }
  return parts;
}

// Generate the Upload Interface Page
function getUploadPageHtml() {
  const uploads = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
  const fileItems = uploads.map(f => {
    const st = fs.statSync(path.join(UPLOADS_DIR, f));
    return `<li class="flex justify-between items-center py-2 px-3 bg-black/40 rounded border border-white/10 font-mono text-sm text-gray-300">
      <span class="truncate">${f}</span>
      <span class="text-xs text-gray-400 shrink-0 ml-4">${(st.size / 1024).toFixed(1)} KB</span>
    </li>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Triplespeed - Code & File Uploader</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/_next/static/css/4824b464087f4d54.css">
  <style>
    body { background-color: #0c0d0e; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-6">
  <div class="w-full max-w-xl bg-gray-900/80 backdrop-blur-md border border-white/10 rounded-xl p-8 shadow-2xl">
    <div class="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white font-mono">Triplespeed Workspace</h1>
        <p class="text-xs text-gray-400 font-mono mt-1">Upload source code, assets, or archives</p>
      </div>
      <a href="/" class="text-xs font-mono px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition">Back to Site &rarr;</a>
    </div>

    <form id="uploadForm" class="space-y-5">
      <div id="dropZone" class="border-2 border-dashed border-white/20 hover:border-white/50 rounded-lg p-8 text-center transition cursor-pointer bg-white/5">
        <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="text-sm font-mono text-gray-300">Drag & drop files here, or <span class="text-blue-400 underline">browse</span></p>
        <p class="text-xs text-gray-500 font-mono mt-1">Supports .zip, .js, .ts, .json, .html, .css, etc.</p>
        <input type="file" id="fileInput" name="files" multiple class="hidden">
      </div>

      <button type="submit" id="uploadBtn" class="w-full py-3 px-4 bg-white text-black font-mono font-medium rounded-lg hover:bg-gray-200 active:scale-95 transition disabled:opacity-50">
        Upload Files
      </button>
    </form>

    <div id="status" class="mt-4 text-xs font-mono text-center hidden"></div>

    <div class="mt-8 pt-6 border-t border-white/10">
      <h2 class="text-xs uppercase tracking-wider text-gray-400 font-mono mb-3">Uploaded Files (${uploads.length})</h2>
      <ul class="space-y-2 max-h-48 overflow-y-auto pr-1">
        ${fileItems || '<li class="text-xs text-gray-500 font-mono italic">No files uploaded yet.</li>'}
      </ul>
    </div>
  </div>

  <script>
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');
    const status = document.getElementById('status');

    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = () => {
      if (fileInput.files.length > 0) {
        dropZone.querySelector('p').textContent = fileInput.files.length + ' file(s) selected';
      }
    };

    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-blue-400'); };
    dropZone.ondragleave = () => { dropZone.classList.remove('border-blue-400'); };
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-blue-400');
      fileInput.files = e.dataTransfer.files;
      dropZone.querySelector('p').textContent = fileInput.files.length + ' file(s) selected';
    };

    uploadForm.onsubmit = async (e) => {
      e.preventDefault();
      if (!fileInput.files.length) return alert('Please select a file first.');

      const formData = new FormData();
      for (const file of fileInput.files) {
        formData.append('files', file);
      }

      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading...';
      status.classList.remove('hidden', 'text-red-400', 'text-green-400');
      status.textContent = 'Uploading files to server...';

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          status.classList.add('text-green-400');
          status.textContent = 'Upload complete! Reloading page...';
          setTimeout(() => window.location.reload(), 1200);
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } catch (err) {
        status.classList.add('text-red-400');
        status.textContent = 'Error: ' + err.message;
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Files';
      }
    };
  </script>
</body>
</html>`;
}

// Serve static file with Range header support for streaming
function serveFile(filePath, req, res, contentType) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
        return res.end();
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': filePath.includes('/_next/static/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Strip nested prefix if accidentally routed relative (e.g. /about/_next -> /_next)
  if (pathname.includes('/_next/')) {
    pathname = pathname.substring(pathname.indexOf('/_next/'));
  }

  // 1. API: File Upload
  if (pathname === '/api/upload') {
    return handleUpload(req, res);
  }

  // 2. Upload Interface UI
  if (pathname === '/upload') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(getUploadPageHtml());
  }

  // 3. Next.js image optimization endpoint
  if (pathname === '/_next/image') {
    if (handleNextImage(parsedUrl, res)) {
      return;
    }
  }

  // 4. Clean Route Mapping
  let candidatePath = path.join(PUBLIC_DIR, pathname);

  // Prevent directory traversal attacks
  if (!candidatePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  // Route root to index.html
  if (pathname === '/' || pathname === '') {
    candidatePath = path.join(PUBLIC_DIR, 'index.html');
  }

  // Check if candidate.html exists first (prefer explicitly mapped html)
  const candidateHtml = candidatePath + '.html';
  if (fs.existsSync(candidateHtml) && fs.statSync(candidateHtml).isFile()) {
    return serveFile(candidateHtml, req, res, 'text/html; charset=utf-8');
  }

  // Check if candidate file exists
  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    const ext = path.extname(candidatePath).toLowerCase();
    const mime = MIME_TYPES[ext] || (ext === '' ? 'text/html; charset=utf-8' : 'application/octet-stream');
    return serveFile(candidatePath, req, res, mime);
  }

  // Check clean directory index (e.g. /about/index.html)
  const candidateDirIndex = path.join(candidatePath, 'index.html');
  if (fs.existsSync(candidateDirIndex) && fs.statSync(candidateDirIndex).isFile()) {
    return serveFile(candidateDirIndex, req, res, 'text/html; charset=utf-8');
  }

  // Check if extensionless file exists (e.g. about, careers, contact, faq)
  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    return serveFile(candidatePath, req, res, 'text/html; charset=utf-8');
  }

  // 404 Fallback
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="background:#0c0d0e;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div><h1>404 | Page Not Found</h1><p><a href="/" style="color:#60a5fa;">Return Home</a></p></div></body></html>`);
});

server.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(`  Triplespeed Web Application Running`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Host:    http://${HOST}:${PORT}`);
  console.log(`  Upload:  http://localhost:${PORT}/upload`);
  console.log(`=========================================`);
});
