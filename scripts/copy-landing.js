import fs from 'fs';
import path from 'path';
import { argv } from 'process';
import { pathToFileURL } from 'url';

function copyLanding(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Landing-Page-Quellverzeichnis nicht gefunden: ${srcDir}`);
  }
  fs.cpSync(srcDir, destDir, { recursive: true });
}

function copyWellKnown() {
  const src = 'well-known';
  const dest = 'dist/.well-known';
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

function copyPlayStoreBadge() {
  const src = path.join('assets', 'google_play_store', 'googleplay-badge-01-getit.width-1440.png');
  const destDir = path.join('dist', 'assets', 'google_play_store');
  const dest = path.join(destDir, path.basename(src));

  if (!fs.existsSync(src)) {
    throw new Error(`Google-Play-Badge nicht gefunden: ${src}`);
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
}

/**
 * Copies hosting configuration files (_redirects, _headers)
 * from dist/app/ (where Vite puts them from public/) to dist/ root
 * where Cloudflare Pages expects them.
 * Also creates a 404.html as copy of dist/app/index.html for SPA fallback:
 * Cloudflare Pages serves 404.html for any route without a matching asset,
 * so by making it the SPA shell, all deep-link routes load the app.
 */
function copyHostingFiles() {
  const files = ['_redirects', '_headers'];
  for (const file of files) {
    const src = path.join('dist', 'app', file);
    const dest = path.join('dist', file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }
  // SPA fallback: 404.html = app index.html
  const spaIndex = path.join('dist', 'app', 'index.html');
  const fallback = path.join('dist', '404.html');
  if (fs.existsSync(spaIndex)) {
    fs.copyFileSync(spaIndex, fallback);
  }
}

if (import.meta.url === pathToFileURL(argv[1]).href) {
  copyLanding('landing', 'dist/landing');
  copyPlayStoreBadge();
  copyWellKnown();
  copyHostingFiles();
}

export { copyLanding };
