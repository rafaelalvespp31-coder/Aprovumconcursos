/* Nível Aprovado — service worker
 * - Arquivos estáticos versionados: cache-first.
 * - Aulas já abertas: network-first com cópia local para leitura offline.
 * - Demais navegações: rede; sem conexão, página /offline.
 * - Nunca armazena respostas de API, ações (POST) nem páginas de conta.
 * - Cache privado é apagado no logout (mensagem "clear-private").
 */
const VERSION = "v1";
const STATIC_CACHE = `na-static-${VERSION}`;
const LESSON_CACHE = `na-aulas-${VERSION}`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon.svg", "/manifest.webmanifest"];
const MAX_LESSONS = 40;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-private") {
    event.waitUntil(caches.delete(LESSON_CACHE));
  }
});

async function trimLessons() {
  const cache = await caches.open(LESSON_CACHE);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_LESSONS))) await cache.delete(k);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode !== "navigate") return;

  const isLesson = url.pathname.startsWith("/aula/");
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Só guarda aulas renderizadas com sucesso e que não sejam redirecionamentos de login.
        if (isLesson && res.ok && !res.redirected) {
          const copy = res.clone();
          caches.open(LESSON_CACHE).then((c) => c.put(req, copy)).then(trimLessons);
        }
        return res;
      })
      .catch(async () => {
        if (isLesson) {
          const hit = await caches.match(req, { cacheName: LESSON_CACHE });
          if (hit) return hit;
        }
        return (await caches.match("/offline")) || new Response("Sem conexão", { status: 503 });
      }),
  );
});
