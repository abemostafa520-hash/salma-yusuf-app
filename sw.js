 const CACHE_NAME = 'salma-yusuf-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // كل ملف لوحده، فلو ملف ناقص باقي الملفات تتخزن عادي
      Promise.all(CORE_ASSETS.map((url) => cache.add(url).catch(() => console.warn('SW: تعذّر تخزين', url))))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (response && response.status === 200) {
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // مانخزّنش أي حاجة من Supabase (بيانات وحسابات)
  if (url.hostname.endsWith('supabase.co')) return;

  // الصفحات: النت الأول (التحديثات توصل فورًا)، والكاش لو مفيش نت
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => putInCache(req, res)).catch(() =>
        caches.match(req).then((c) => c || caches.match('./app.html'))
      )
    );
    return;
  }

  // باقي الملفات: من الكاش فورًا وتتحدّث في الخلفية
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => putInCache(req, res)).catch(() => cached);
      return cached || network;
    })
  );
});
