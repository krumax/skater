import fs from 'fs';
import path from 'path';
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

/**
 * Copies hosting configuration files (_redirects, _headers, 404.html)
 * from dist/app/ (where Vite puts them from public/) to dist/ root
 * where Cloudflare Pages expects them.
 */
function copyHostingFiles() {
  const files = ['_redirects', '_headers', '404.html'];
  for (const file of files) {
    const src = path.join('dist', 'app', file);
    const dest = path.join('dist', file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  copyLanding('landing', 'dist/landing');
  copyWellKnown();
  copyHostingFiles();
}

export { copyLanding };
