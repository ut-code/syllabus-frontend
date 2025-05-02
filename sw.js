
const BUILD_VERSION = 1

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
]

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
  	const c = await self.caches.open("1")
  	await c.addAll(files)
  })())
  self.skipWaiting()
})

self.addEventListener("fetch", (e) => {
  e.respondWith((async () => {
    const c = await self.caches.open("1")
    const res = await c.match(e.request)
    if(res){
      return res
    }else {
      return fetch(e.request)
    }
  }))
})
