import fs from 'fs';
import { pathToFileURL } from 'url';

function copyLanding(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Landing-Page-Quellverzeichnis nicht gefunden: ${srcDir}`);
  }
  fs.cpSync(srcDir, destDir, { recursive: true });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  copyLanding('landing', 'dist/landing');
  // _redirects in dist/ schreiben
  // /landing/* → Landing Page statisch servieren (kein Rewrite nötig, Cloudflare findet dist/landing/index.html)
  // /* → SPA-Fallback für React App
  fs.writeFileSync('dist/_redirects', '/landing  /landing/index.html  200\n/landing/*  /landing/index.html  200\n/*  /index.html  200\n');
}

export { copyLanding };
