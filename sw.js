// Офлайн: файлы приложения — из кэша с фоновым обновлением, шрифты — из кэша после первой загрузки.
// При изменении файлов приложения поднимайте версию.
const VERSION = 'srpski-7';
const APP = ['./', 'index.html', 'css/app.css', 'js/data.js', 'js/pics.js', 'js/cases.js', 'js/dialogs.js', 'js/reading.js', 'js/topics.js', 'js/mascot.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // материалы для соцсетей и видео — напрямую из сети: Safari не воспроизводит и не скачивает видео через обработчик
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes('/promo/')) return;
  if (req.headers.has('range') || req.destination === 'video' || req.destination === 'audio') return;
  e.respondWith(
    caches.open(VERSION).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.status === 200 || res.type === 'opaque')) c.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    }))
  );
});
