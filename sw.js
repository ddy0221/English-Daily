// 오프라인 캐시: 앱 파일과 단어 데이터 전체. 파일을 바꾸면 VERSION을 올린다.
const VERSION = 'ed-v2';
const FILES = [
  './',
  'index.html',
  'config.js',
  'manifest.webmanifest',
  'morning/',
  'morning/index.html',
  'assets/css/style.css',
  'assets/js/core.js',
  'assets/js/store.js',
  'assets/js/quiz.js',
  'assets/js/tts.js',
  'assets/js/morning.js',
  'assets/icon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'data/curriculum.md',
  'data/words/day-01.json',
  'data/words/day-02.json',
  'data/words/day-03.json',
  'data/words/day-04.json',
  'data/words/day-05.json',
  'data/words/day-06.json',
  'data/words/day-07.json',
  'data/words/day-08.json',
  'data/words/day-09.json',
  'data/words/day-10.json',
  'data/words/day-11.json',
  'data/words/day-12.json',
  'data/words/day-13.json',
  'data/words/day-14.json',
  'data/words/day-15.json',
  'data/words/day-16.json',
  'data/words/day-17.json',
  'data/words/day-18.json',
  'data/words/day-19.json',
  'data/words/day-20.json',
  'data/words/day-21.json',
  'data/words/day-22.json',
  'data/words/day-23.json',
  'data/words/day-24.json',
  'data/words/day-25.json',
  'data/words/day-26.json',
  'data/words/day-27.json',
  'data/words/day-28.json',
  'data/words/day-29.json',
  'data/words/day-30.json',
  'data/words/day-31.json',
  'data/words/day-32.json',
  'data/words/day-33.json',
  'data/words/day-34.json',
  'data/words/day-35.json',
  'data/words/day-36.json',
  'data/words/day-37.json',
  'data/words/day-38.json',
  'data/words/day-39.json',
  'data/words/day-40.json',
  'data/words/day-41.json',
  'data/words/day-42.json',
  'data/words/day-43.json',
  'data/words/day-44.json',
  'data/words/day-45.json',
  'data/words/day-46.json',
  'data/words/day-47.json',
  'data/words/day-48.json',
  'data/words/day-49.json',
  'data/words/day-50.json',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// stale-while-revalidate: 캐시를 바로 주고, 온라인이면 뒤에서 새 버전으로 갱신
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
