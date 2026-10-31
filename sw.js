/* Villora Event: ana ekrana eklenebilir uygulama (PWA).
   Önce internetten taze dosya alınır; internet yoksa hafızadaki kopya ya da çevrimdışı sayfası gösterilir.
   Her site güncellemesinde aşağıdaki numarayı artır: telefondaki uygulama eski hafızayı atıp yenisini alır. */
const CACHE_NAME = "villora-v41";
const ASSETS = [
  "./index.html", "./admin.html", "./offline.html",
  "./css/ortak.css", "./css/site.css", "./css/admin.css", "./fonts/el-yazisi.css",
  "./js/supabase.js", "./js/config.js", "./js/ortak.js", "./js/site.js", "./js/shorts.js", "./js/dergi.js", "./js/admin.js", "./js/sozlesme.js",
  "./img/logo.png", "./img/logo-isaret.png", "./img/icon-192.png", "./img/icon-512.png"
];
const CACHELENEN = /\.(html|css|js|png|jpg|jpeg|svg|ico|json|webmanifest|webp|woff2)$/i;

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {})))));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // Supabase, YouTube, harita: hiç karışma
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then(res => {
      if (res && res.status === 200 && (req.mode === "navigate" || CACHELENEN.test(url.pathname))) {
        const kopya = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, kopya));
      }
      return res;
    }).catch(() =>
      caches.match(req).then(c => c || (req.mode === "navigate" ? caches.match("./offline.html") : Response.error()))
    )
  );
});
