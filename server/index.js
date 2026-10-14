const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const TMDB_BASE = 'https://api.themoviedb.org/3';
const apiKey = process.env.TMDB_API_KEY;

// Solo IDs numéricos, para no armar URLs arbitrarias hacia TMDB
app.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ID inválido' });
  next();
});

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Falta el parámetro q' });
  }
  try {
    const url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=es-AR&include_adult=false`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Error al consultar TMDB' });
  }
});

app.get('/api/trending', async (req, res) => {
  try {
    const url = `${TMDB_BASE}/trending/movie/week?api_key=${apiKey}&language=es-AR`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Error al consultar TMDB' });
  }
});

app.get('/api/movie/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const url = `${TMDB_BASE}/movie/${id}?api_key=${apiKey}&language=es-AR&append_to_response=videos`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Error al consultar TMDB' });
  }
});

app.get('/api/movie/:id/providers', async (req, res) => {
  const { id } = req.params;
  try {
    const url = `${TMDB_BASE}/movie/${id}/watch/providers?api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data.results?.AR || {});
  } catch (err) {
    res.status(502).json({ error: 'Error al consultar TMDB' });
  }
});

// En producción el mismo server sirve el frontend compilado
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
