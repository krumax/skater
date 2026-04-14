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
  
  // Erstelle 404.html um Cloudflare's automatisches SPA-Verhalten zu deaktivieren
  fs.writeFileSync('dist/404.html', '<!DOCTYPE html><html><head><title>404</title></head><body>404 Not Found</body></html>');
  
  // _redirects: Landing Page auf /, React App auf /app
  fs.writeFileSync('dist/_redirects', 
    '/landing  /landing/index.html  200\n' +
    '/landing/*  /landing/index.html  200\n' +
    '/app  /app/index.html  200\n' +
    '/app/*  /app/index.html  200\n' +
    '/  /index.html  200\n'
  );
}

export { copyLanding };
