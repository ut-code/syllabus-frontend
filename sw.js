/**
 * バージョンを示す整数値.
 * sw.js以外の任意のhtml,jsファイルに変更がある場合この値を加算すること
 * ファイルの追加がある場合は下の files も更新する
 *
 * ちなみにこのバージョン番号はどこからも使われていないが、
 * sw.jsを1文字以上変更することでサービスワーカーが更新される仕様のため置いている
 */
const VERSION = 1;

const files = [
  "/aboutus",
  "/disclaimer",
  "/errorMessage/error1.txt",
  "/errorMessage/error2.txt",
  "/errorMessage/error3.txt",
  "/errorMessage/error4.txt",
  "/errorMessage/error5.txt",
  "/errorMessage/error6.txt",
  "/howToUse",
  "/",
  "/lz-string.min.js",
  "/notion",
  "/resources/favicon-utcode.png",
  "/resources/utc-logo.svg",
  "/script.js",
  "/style.css",
  "/material-icons.css",
  "https://cdn.jsdelivr.net/npm/@material-design-icons/font@0.14.15/material-icons.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const c = await self.caches.open("main");
      await c.addAll(files);
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.url.startsWith("https://www.googletagmanager.com")) {
    return;
  }
  e.respondWith(
    (async () => {
      const c = await self.caches.open("main");
      const res = await c.match(e.request);
      if (res) {
        return res;
      }
      console.warn(`${e.request.url} is not in cache in sw.js`);
      return fetch(e.request);
    })(),
  );
});
