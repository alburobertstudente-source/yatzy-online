/**
 * Service worker: rende il gioco installabile e lo fa partire anche senza rete
 * (la partita sullo stesso telefono funziona offline; l'online richiede internet).
 * Strategia: prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata.
 */
const CACHE = 'yatzy-duello-v3';
const AUDIO = 'yatzy-duello-audio-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== AUDIO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // account e classifica: sempre dalla rete
  if (url.pathname.includes('/audio/')) {
    // musica e ambienti arrivano in streaming (richieste a pezzi): ci pensa la cache del browser
    if (req.headers.has('range') || url.pathname.includes('/music/') || url.pathname.includes('/amb/')) return;
    // effetti ed elenco dei suoni: prima la copia salvata (funzionano anche offline), aggiornata in sottofondo
    event.respondWith(
      caches.open(AUDIO).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req)
            .then((res) => {
              if (res.ok && res.status === 200) c.put(req, res.clone()).catch(() => {});
              return res;
            })
            .catch(() => hit);
          return hit || net;
        }),
      ),
    );
    return;
  }
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))),
  );
});
