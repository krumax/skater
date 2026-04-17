import fs from 'fs';
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  copyLanding('landing', 'dist/landing');
  copyWellKnown();
}

export { copyLanding };
