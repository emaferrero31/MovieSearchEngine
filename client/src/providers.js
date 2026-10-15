// TMDB no da links directos a la película en cada plataforma, así que abrimos
// la búsqueda de la plataforma con el título. En mobile, si la app está
// instalada, la mayoría de estas URLs se abren directo en la app.
// Se matchea por nombre porque TMDB tiene variantes (ej: "Netflix basic with Ads").
const SEARCH_URLS = [
  { match: /netflix/i, url: (q) => `https://www.netflix.com/search?q=${q}` },
  { match: /amazon|prime video/i, url: (q) => `https://www.primevideo.com/search/?phrase=${q}` },
  { match: /disney/i, url: (q) => `https://www.disneyplus.com/search?q=${q}` },
  { match: /\bmax\b|hbo/i, url: (q) => `https://play.hbomax.com/search?q=${q}` },
  { match: /apple/i, url: (q) => `https://tv.apple.com/search?term=${q}` },
  { match: /google play/i, url: (q) => `https://play.google.com/store/search?q=${q}&c=movies` },
  { match: /paramount/i, url: (q) => `https://www.paramountplus.com/search/?q=${q}` },
  { match: /youtube/i, url: (q) => `https://www.youtube.com/results?search_query=${q}` },
  { match: /mubi/i, url: (q) => `https://mubi.com/search/films?query=${q}` },
  { match: /crunchyroll/i, url: (q) => `https://www.crunchyroll.com/search?q=${q}` },
]

// Devuelve el link para un proveedor, o el fallback (página de TMDB/JustWatch)
export function providerUrl(providerName, title, fallback) {
  const entry = SEARCH_URLS.find((p) => p.match.test(providerName))
  return entry ? entry.url(encodeURIComponent(title)) : fallback
}
