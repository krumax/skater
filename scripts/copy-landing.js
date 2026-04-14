import fs from 'fs';
import { pathToFileURL } from 'url';

function copyLanding(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Landing-Page-Quellverzeichnis nicht gefunden: ${srcDir}`);
  }
  fs.cpSync(srcDir, destDir, { recursive: true });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  copyLanding('landing', 'dist');
}

export { copyLanding };
