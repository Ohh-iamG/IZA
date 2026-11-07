import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig } from 'vite';

function suppressHmrWsErrorPlugin() {
  return {
    name: 'suppress-hmr-ws-error',
    transformIndexHtml: {
      order: 'pre' as const,
      handler() {
        return [
          {
            tag: 'script',
            attrs: { type: 'text/javascript' },
            injectTo: 'head-prepend' as const,
            children: `
              (function() {
                // Intercept Vite HMR WebSocket connections to prevent cloud ingress drops from throwing
                const OriginalWebSocket = window.WebSocket;
                if (OriginalWebSocket) {
                  window.WebSocket = new Proxy(OriginalWebSocket, {
                    construct(target, args) {
                      const url = args[0];
                      const protocols = args[1];
                      const isViteHmr = (typeof protocols === 'string' && protocols === 'vite-hmr') ||
                        (Array.isArray(protocols) && protocols.includes('vite-hmr'));
                      if (isViteHmr) {
                        const emitter = new EventTarget();
                        emitter.readyState = 1;
                        emitter.OPEN = 1;
                        emitter.CONNECTING = 0;
                        emitter.CLOSING = 2;
                        emitter.CLOSED = 3;
                        emitter.url = String(url);
                        emitter.protocol = 'vite-hmr';
                        emitter.binaryType = 'blob';
                        emitter.bufferedAmount = 0;
                        emitter.extensions = '';
                        emitter.send = function() {};
                        emitter.close = function() {};
                        setTimeout(function() {
                          emitter.dispatchEvent(new Event('open'));
                        }, 0);
                        return emitter;
                      }
                      return Reflect.construct(target, args);
                    }
                  });
                }

                // Global suppression for any transient Vite WebSocket disconnect/rejection warnings
                const origConsoleError = console.error;
                console.error = function(...args) {
                  const allText = args.map(function(a) {
                    return (a instanceof Error ? (a.message + ' ' + (a.stack || '')) : String(a));
                  }).join(' ');
                  if (
                    allText.includes('WebSocket closed without opened') ||
                    allText.includes('failed to connect to websocket') ||
                    (allText.includes('[vite]') && allText.toLowerCase().includes('websocket'))
                  ) {
                    return;
                  }
                  origConsoleError.apply(console, args);
                };
                window.addEventListener('unhandledrejection', function(e) {
                  const reasonStr = (e.reason?.message || '') + ' ' + (e.reason?.stack || '') + ' ' + String(e.reason || '');
                  if (
                    reasonStr.includes('WebSocket closed without opened') ||
                    reasonStr.includes('vite-hmr') ||
                    reasonStr.includes('[vite]')
                  ) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                  }
                }, true);
                window.addEventListener('error', function(e) {
                  const errStr = (e.message || '') + ' ' + (e.error?.message || '') + ' ' + (e.error?.stack || '') + ' ' + (e.filename || '');
                  if (errStr.includes('WebSocket closed without opened') || errStr.includes('@vite/client')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                  }
                }, true);
              })();
            `,
          },
        ];
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      suppressHmrWsErrorPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        includeAssets: [
          'favicon.ico',
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'manifest.json',
          'sw-push.js'
        ],
        manifest: {
          id: '/',
          name: 'IZA Life',
          short_name: 'IZA Life',
          description: 'Your quiet personal life companion. Everything you capture becomes a Moment.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          theme_color: '#0D1B1E',
          background_color: '#0D1B1E',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          importScripts: ['/sw-push.js'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              urlPattern: /^\/api\/pulse\/daily/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'daily-pulse-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 4,
                },
              },
            },
            {
              urlPattern: /^\/api\/entities/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'entities-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 12,
                },
              },
            },
            {
              urlPattern: /^\/api\/circle/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'circle-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 2,
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
