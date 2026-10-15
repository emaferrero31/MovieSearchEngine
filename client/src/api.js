// En desarrollo Vite redirige /api al backend (ver vite.config.js)
const API_BASE = '/api'
export const IMG_BASE = 'https://image.tmdb.org/t/p'

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    // El server responde { error } con un mensaje para mostrar; si no hay, error genérico
    const body = await res.json().catch(() => null)
    const err = new Error(body?.error || `HTTP ${res.status}`)
    err.userMessage = body?.error
    throw err
  }
  return res.json()
}

// type: 'all' | 'movie' | 'tv'
export const searchTitles = (q, type) => get(`/search?q=${encodeURIComponent(q)}&type=${type}`)
export const getTrending = (type) => get(`/trending?type=${type}`)
// mediaType: 'movie' | 'tv'
export const getDetails = (mediaType, id) => get(`/${mediaType}/${id}`)
export const getProviders = (mediaType, id) => get(`/${mediaType}/${id}/providers`)
export const getGenres = () => get('/genres')
export const discoverTitles = (type, genre, sort) =>
  get(`/discover?type=${type}&genre=${encodeURIComponent(genre)}&sort=${sort}`)
// dept: rol principal de la persona (known_for_department de TMDB)
export const getPersonCredits = (id, dept) =>
  get(`/person/${id}/credits${dept ? `?dept=${encodeURIComponent(dept)}` : ''}`)
