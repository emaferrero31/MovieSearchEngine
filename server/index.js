const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const express = require('express');

const app = express();

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_TIMEOUT_MS = 8000;
const MAX_QUERY_LENGTH = 100;
const apiKey = process.env.TMDB_API_KEY;

if (!apiKey) {
  console.warn('Falta TMDB_API_KEY: las llamadas a TMDB van a fallar (ver server/.env.example)');
}

class TmdbError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Llama a TMDB y devuelve el JSON, o lanza TmdbError si algo sale mal
async function tmdb(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.search = new URLSearchParams({ api_key: apiKey, ...params });

  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TMDB_TIMEOUT_MS) });
  } catch (err) {
    if (err.name === 'TimeoutError') throw new TmdbError(504, 'TMDB tardó demasiado en responder');
    throw new TmdbError(502, 'No se pudo conectar con TMDB');
  }

  if (!response.ok) {
    if (response.status === 404) throw new TmdbError(404, 'Título no encontrado');
    if (response.status === 429) throw new TmdbError(503, 'Demasiadas consultas, probá en unos segundos');
    console.error(`TMDB respondió ${response.status} para ${endpoint}`);
    throw new TmdbError(502, 'Error al consultar TMDB');
  }

  return response.json();
}

// Envuelve un handler async y traduce los errores a una respuesta JSON
const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    if (!(err instanceof TmdbError)) console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Error interno' });
  }
};

const MEDIA_TYPES = ['movie', 'tv'];

// Las series usan otros nombres de campo; los unificamos con los de películas
// para que el cliente trate a ambas igual
function normalize(item, mediaType) {
  return {
    ...item,
    media_type: item.media_type || mediaType,
    title: item.title ?? item.name,
    release_date: item.release_date ?? item.first_air_date,
    runtime: item.runtime ?? item.episode_run_time?.[0],
  };
}

// Normaliza una lista de resultados. En búsquedas "all" TMDB mezcla personas:
// van aparte en `people` para que el cliente las muestre por separado
function normalizeList(data, mediaType) {
  const items = data.results || [];
  const results = items
    .filter((item) => mediaType !== 'all' || MEDIA_TYPES.includes(item.media_type))
    .map((item) => normalize(item, mediaType));
  const people = items
    .filter((item) => item.media_type === 'person')
    .map(({ id, name, profile_path, known_for_department }) => ({ id, name, profile_path, known_for_department }));
  return { ...data, results, people };
}

// Talk shows, noticieros y realities: los actores aparecen en cientos y tapan su filmografía
const NON_FICTION_TV_GENRES = [10763, 10764, 10767];

// TMDB usa géneros distintos para películas y series (ej: las series tienen
// "Action & Adventure" y no tienen "Horror"), así que los unificamos acá
const GENRES = [
  { key: 'action', label: 'Acción', movie: [28], tv: [10759] },
  { key: 'adventure', label: 'Aventura', movie: [12], tv: [10759] },
  { key: 'animation', label: 'Animación', movie: [16], tv: [16] },
  { key: 'comedy', label: 'Comedia', movie: [35], tv: [35] },
  { key: 'crime', label: 'Crimen', movie: [80], tv: [80] },
  { key: 'documentary', label: 'Documental', movie: [99], tv: [99] },
  { key: 'drama', label: 'Drama', movie: [18], tv: [18] },
  { key: 'family', label: 'Familia', movie: [10751], tv: [10751] },
  { key: 'fantasy', label: 'Fantasía', movie: [14], tv: [10765] },
  { key: 'scifi', label: 'Ciencia ficción', movie: [878], tv: [10765] },
  { key: 'history', label: 'Historia', movie: [36], tv: [] },
  { key: 'horror', label: 'Terror', movie: [27], tv: [] },
  { key: 'mystery', label: 'Misterio', movie: [9648], tv: [9648] },
  { key: 'romance', label: 'Romance', movie: [10749], tv: [] },
  { key: 'thriller', label: 'Suspenso', movie: [53], tv: [] },
  { key: 'war', label: 'Bélica', movie: [10752], tv: [10768] },
  { key: 'western', label: 'Western', movie: [37], tv: [37] },
];

// Lo más popular (o mejor valorado / más reciente) de un género
async function discover(mediaType, genre, sort) {
  const ids = genre[mediaType];
  if (!ids.length) return [];
  const isMovie = mediaType === 'movie';
  const dateField = isMovie ? 'primary_release_date' : 'first_air_date';
  const params = { language: 'es-AR', include_adult: 'false', with_genres: ids.join('|') };
  if (sort === 'rating') {
    params.sort_by = 'vote_average.desc';
    params['vote_count.gte'] = '300';
  } else if (sort === 'recent') {
    params.sort_by = `${dateField}.desc`;
    params[`${dateField}.lte`] = new Date().toISOString().slice(0, 10); // sin estrenos futuros
    params['vote_count.gte'] = '10';
  } else {
    params.sort_by = 'popularity.desc';
  }
  const data = await tmdb(`/discover/${mediaType}`, params);
  return (data.results || []).map((item) => normalize(item, mediaType));
}

// ?type=all|movie|tv (por defecto all)
function parseListType(req, res, next) {
  const type = req.query.type || 'all';
  if (type !== 'all' && !MEDIA_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }
  req.listType = type;
  next();
}

// Solo IDs numéricos, para no armar URLs arbitrarias hacia TMDB
app.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  next();
});

app.param('type', (req, res, next, type) => {
  if (!MEDIA_TYPES.includes(type)) return res.status(400).json({ error: 'Tipo inválido' });
  next();
});

app.get('/api/search', parseListType, (req, res, next) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query) return res.status(400).json({ error: 'Falta el parámetro q' });
  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: `La búsqueda no puede superar ${MAX_QUERY_LENGTH} caracteres` });
  }
  req.searchQuery = query;
  next();
}, handle(async (req) => {
  const endpoint = req.listType === 'all' ? '/search/multi' : `/search/${req.listType}`;
  const data = await tmdb(endpoint, { query: req.searchQuery, language: 'es-AR', include_adult: 'false' });
  return normalizeList(data, req.listType);
}));

app.get('/api/trending', parseListType, handle(async (req) => {
  const data = await tmdb(`/trending/${req.listType}/week`, { language: 'es-AR' });
  return normalizeList(data, req.listType);
}));

app.get('/api/genres', (req, res) => res.json(GENRES));

// ?type=all|movie|tv&genre=<key>&sort=relevance|rating|recent
app.get('/api/discover', parseListType, handle(async (req) => {
  const genre = GENRES.find((g) => g.key === req.query.genre);
  if (!genre) throw new TmdbError(400, 'Género inválido');
  const types = req.listType === 'all' ? MEDIA_TYPES : [req.listType];
  const lists = await Promise.all(types.map((t) => discover(t, genre, req.query.sort)));
  // Al combinar películas y series, intercalamos por popularidad
  const results = lists.flat().sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  return { results };
}));

// Películas y series de una persona. ?dept=Acting|Directing|Writing|... limita los
// créditos a su rol principal (así un director no muestra lo que solo produjo)
app.get('/api/person/:id/credits', handle(async (req) => {
  const data = await tmdb(`/person/${req.params.id}/combined_credits`, { language: 'es-AR' });
  const { dept } = req.query;
  let credits;
  if (dept === 'Acting') credits = data.cast || [];
  else if (dept) credits = (data.crew || []).filter((c) => c.department === dept);
  // Sin dept, o si el filtro no deja nada, mostramos todo
  if (!credits?.length) credits = [...(data.cast || []), ...(data.crew || [])];

  const seen = new Set();
  const results = credits
    .filter((item) => MEDIA_TYPES.includes(item.media_type))
    .filter((item) => !item.genre_ids?.some((g) => NON_FICTION_TV_GENRES.includes(g)))
    .filter((item) => {
      // Alguien puede tener varios créditos en el mismo título (ej: actuar y dirigir)
      const key = `${item.media_type}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => normalize(item, item.media_type))
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  return { results };
}));

app.get('/api/:type/:id', handle(async (req) => {
  const { type, id } = req.params;
  const data = await tmdb(`/${type}/${id}`, { language: 'es-AR', append_to_response: 'videos' });
  return normalize(data, type);
}));

app.get('/api/:type/:id/providers', handle(async (req) => {
  const { type, id } = req.params;
  const data = await tmdb(`/${type}/${id}/watch/providers`);
  return data.results?.AR || {};
}));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
