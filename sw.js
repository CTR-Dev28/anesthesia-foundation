/* Anesthesia Foundation service worker, version 0.1.1.
   Goal: the app opens with no signal (operating rooms), but a doctor with signal never keeps old dose data.
   - Pages and data (index.html, manifest): network first, 2.5 s timeout, then the cached copy.
   - Fonts and icons: cache first (they never change within a version).
   The cache name carries the version, so a new release drops the old cache on activate. */
const VERSION = '0.1.1';
const CACHE = 'anesthesia-foundation-' + VERSION;
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "apple-touch-icon-180.png",
  "favicon-32.png",
  "favicon-64.png",
  "pwa-192.png",
  "pwa-512.png",
  "pwa-maskable-512.png",
  "ibm-plex-mono-latin-400-normal.woff2",
  "ibm-plex-mono-latin-500-normal.woff2",
  "ibm-plex-mono-latin-600-normal.woff2",
  "ibm-plex-sans-latin-400-normal.woff2",
  "ibm-plex-sans-latin-500-normal.woff2",
  "ibm-plex-sans-latin-600-normal.woff2"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('anesthesia-foundation-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const fromCache = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'));
    const timer = setTimeout(() => { if (!settled) fromCache().then((r) => { if (r && !settled) { settled = true; resolve(r); } }); }, timeoutMs);
    fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      if (!settled) { settled = true; clearTimeout(timer); resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      if (!settled) fromCache().then((r) => { settled = true; resolve(r || Response.error()); });
    });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // never touch other sites (source links)
  const isStatic = /\.(woff2|png|svg|ico)$/.test(url.pathname);
  e.respondWith(isStatic
    ? caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }))
    : networkFirst(req, 2500));
});
