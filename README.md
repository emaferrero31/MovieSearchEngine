# MovieSearchEngine — ¿Dónde la veo?

Buscador de películas que muestra en qué plataformas se pueden ver, alquilar o comprar en Argentina.
Usa datos de [TMDB](https://www.themoviedb.org/) (los proveedores vienen de JustWatch a través de TMDB).

## Estructura

```
client/   Frontend: React + Vite + Tailwind
server/   Backend: Express, hace de proxy a TMDB para no exponer la API key
vercel.json  Deploy en Vercel (client y server como servicios separados)
```

## Requisitos

- Node.js 18.17 o superior
- Una API key de TMDB (v3). Se obtiene gratis en https://www.themoviedb.org/settings/api

## Cómo correrlo en local

1. Configurar el backend:

   ```bash
   cd server
   cp .env.example .env   # y completar TMDB_API_KEY
   npm install
   npm run dev            # http://localhost:4000
   ```

2. En otra terminal, el frontend:

   ```bash
   cd client
   npm install
   npm run dev            # http://localhost:5173
   ```

   En desarrollo, Vite redirige `/api` al backend en el puerto 4000.

## Variables de entorno (server)

| Variable       | Descripción                         | Default |
| -------------- | ----------------------------------- | ------- |
| `TMDB_API_KEY` | API key v3 de TMDB (obligatoria)    | —       |
| `PORT`         | Puerto del servidor Express         | `4000`  |

En Vercel, `TMDB_API_KEY` se configura en las variables de entorno del proyecto.

## API del backend

| Ruta                          | Descripción                                   |
| ----------------------------- | --------------------------------------------- |
| `GET /api/search?q=texto&type=all` | Busca películas y/o series (máx. 100 caracteres) |
| `GET /api/trending?type=all`       | Tendencias de la semana                          |
| `GET /api/:type/:id`               | Detalle de una película o serie, incluye videos  |
| `GET /api/:type/:id/providers`     | Plataformas disponibles en Argentina             |
| `GET /api/genres`                  | Géneros unificados de películas y series         |
| `GET /api/discover?type=all&genre=horror&sort=relevance` | Lo más popular de un género (`sort`: `relevance`, `rating`, `recent`) |
| `GET /api/person/:id/credits?dept=Acting` | Películas y series de una persona (por rol: `Acting`, `Directing`, etc.) |

Con `type=all`, la búsqueda también devuelve `people` con las personas que coinciden (actores, directores, etc.).

`type` es `movie` o `tv`; en búsqueda y tendencias también acepta `all` (default).
Los resultados de series se normalizan a los campos de películas (`title`, `release_date`, `runtime`)
y todos incluyen `media_type`.

Ante un error, el backend responde `{ "error": "mensaje" }` con el código HTTP correspondiente
(400 parámetros inválidos, 404 no encontrada, 502/503/504 problemas con TMDB).
