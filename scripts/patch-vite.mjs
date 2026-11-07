import fs from 'fs';
import path from 'path';

const clientPath = path.resolve('node_modules/vite/dist/client/client.mjs');

if (fs.existsSync(clientPath)) {
  let content = fs.readFileSync(clientPath, 'utf-8');
  let changed = false;

  if (content.includes('reject(new Error("WebSocket closed without opened."));')) {
    content = content.replace(
      'reject(new Error("WebSocket closed without opened."));',
      'isOpened = true; resolve(); return;'
    );
    changed = true;
  }

  // Also prevent secondary console.error warning if direct connection fallback fails in cloud ingress
  if (content.includes('console.error(\n                  `[vite] failed to connect to websocket.')) {
    content = content.replace(
      'console.error(\n                  `[vite] failed to connect to websocket.',
      'console.debug(\n                  `[vite] failed to connect to websocket.'
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(clientPath, content, 'utf-8');
    console.log('[patch-vite] Successfully patched vite/dist/client/client.mjs');
  } else {
    console.log('[patch-vite] vite/dist/client/client.mjs is already safe');
  }
} else {
  console.log('[patch-vite] vite client file not found; skipping');
}
