// En desarrollo Vite redirige /api al backend (ver vite.config.js)
const API_BASE = '/api'
export const IMG_BASE = 'https://image.tmdb.org/t/p'

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const searchMovies = (q) => get(`/search?q=${encodeURIComponent(q)}`)
export const getTrending = () => get('/trending')
export const getMovie = (id) => get(`/movie/${id}`)
export const getProviders = (id) => get(`/movie/${id}/providers`)
