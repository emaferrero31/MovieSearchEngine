import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpDown, Clapperboard, Loader2, Search, SearchX, Tags, TrendingUp, X } from 'lucide-react'
import { IMG_BASE, discoverTitles, getGenres, getPersonCredits, getTrending, searchTitles } from './api'
import { MovieCard, MovieCardSkeleton } from './components/MovieCard'
import { MovieModal } from './components/MovieModal'
import { PersonRow } from './components/PersonRow'

const CONNECTION_ERROR = 'No se pudo conectar con el servidor. ¿Está corriendo el backend?'

const FILTERS = [
  { key: 'all', label: 'Todo' },
  { key: 'movie', label: 'Películas' },
  { key: 'tv', label: 'Series' },
]

const SORTS = [
  { key: 'relevance', label: 'Relevancia' },
  { key: 'rating', label: 'Mejor valoradas' },
  { key: 'recent', label: 'Más recientes' },
]

// Con pocos votos el promedio no es confiable (un solo voto de 10 = 10.0),
// así que esos títulos van al final al ordenar por valoración
const MIN_VOTES = 20

function sortTitles(list, sort) {
  if (sort === 'relevance') return list
  const sorted = [...list]
  if (sort === 'rating') {
    const score = (m) => (m.vote_count >= MIN_VOTES ? m.vote_average : -1)
    sorted.sort((a, b) => score(b) - score(a) || (b.vote_count || 0) - (a.vote_count || 0))
  } else if (sort === 'recent') {
    sorted.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
  }
  return sorted
}

function App() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('relevance')
  const [genres, setGenres] = useState([])
  const [genre, setGenre] = useState('')
  const [discovered, setDiscovered] = useState(null)
  const [results, setResults] = useState(null)
  const [people, setPeople] = useState([])
  const [person, setPerson] = useState(null)
  const [credits, setCredits] = useState(null)
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let cancelled = false
    setTrending([])
    getTrending(filter)
      .then((data) => !cancelled && setTrending(data.results || []))
      .catch((err) => !cancelled && setError(err.userMessage || CONNECTION_ERROR))
    return () => {
      cancelled = true
    }
  }, [filter])

  useEffect(() => {
    // Si falla no mostramos error: la app funciona igual sin el selector de géneros
    getGenres()
      .then(setGenres)
      .catch(() => {})
  }, [])

  // Sin búsqueda, elegir un género muestra lo más popular de ese género
  const hasQuery = query.trim() !== ''
  useEffect(() => {
    if (!genre || hasQuery) {
      setDiscovered(null)
      return
    }
    let cancelled = false
    setDiscovered(null)
    discoverTitles(filter, genre, sort)
      .then((data) => !cancelled && setDiscovered(data.results || []))
      .catch((err) => !cancelled && setError(err.userMessage || CONNECTION_ERROR))
    return () => {
      cancelled = true
    }
  }, [genre, filter, sort, hasQuery])

  // Búsqueda mientras se escribe, con debounce
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults(null)
      setPeople([])
      setLoading(false)
      return
    }
    setLoading(true)
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const data = await searchTitles(q, filter)
        if (!cancelled) {
          setResults(data.results || [])
          setPeople(data.people || [])
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setResults(null)
          setPeople([])
          setError(err.userMessage || CONNECTION_ERROR)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, filter])

  // Filmografía de la persona elegida (se trae una vez; el filtro se aplica acá)
  useEffect(() => {
    if (!person) {
      setCredits(null)
      return
    }
    let cancelled = false
    setCredits(null)
    getPersonCredits(person.id, person.known_for_department)
      .then((data) => !cancelled && setCredits(data.results || []))
      .catch((err) => !cancelled && setError(err.userMessage || CONNECTION_ERROR))
    return () => {
      cancelled = true
    }
  }, [person])

  const closeModal = useCallback(() => setSelected(null), [])

  // Escribir otra búsqueda sale de la vista de la persona
  const changeQuery = (value) => {
    setQuery(value)
    setPerson(null)
  }

  const isSearching = hasQuery
  const genreInfo = genres.find((g) => g.key === genre)
  const movies = useMemo(() => {
    let list
    if (person) {
      list = (credits || []).filter((m) => filter === 'all' || m.media_type === filter)
    } else if (isSearching) {
      list = results || []
    } else {
      list = genreInfo ? discovered || [] : trending
    }
    // En búsquedas y filmografías el género se filtra acá (discover ya viene filtrado)
    if (genreInfo && (person || isSearching)) {
      list = list.filter((m) => {
        const ids = m.media_type === 'tv' ? genreInfo.tv : genreInfo.movie
        return m.genre_ids?.some((id) => ids.includes(id))
      })
    }
    return sortTitles(list, sort)
  }, [person, credits, filter, isSearching, results, genreInfo, discovered, trending, sort])
  const featured = trending.find((m) => m.backdrop_path)
  const showPeople = isSearching && !person && !loading && people.length > 0
  let showSkeletons, noResults
  if (person) {
    showSkeletons = !credits && !error
    noResults = credits && movies.length === 0
  } else if (isSearching) {
    showSkeletons = loading
    noResults = !loading && results && movies.length === 0 && !showPeople
  } else if (genreInfo) {
    showSkeletons = !discovered && !error
    noResults = discovered && movies.length === 0
  } else {
    showSkeletons = !trending.length && !error
    noResults = false
  }
  const typeLabel = filter === 'tv' ? 'series' : filter === 'movie' ? 'películas' : 'títulos'
  const noResultsMessage = person
    ? `No encontramos ${typeLabel} de ${person.name} con estos filtros.`
    : genreInfo
      ? `No hay ${typeLabel} de ${genreInfo.label.toLowerCase()}${isSearching ? ' en estos resultados' : ''}.`
      : 'No encontramos resultados con ese nombre.'

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden">
        {featured && (
          <img
            src={`${IMG_BASE}/w1280${featured.backdrop_path}`}
            alt=""
            className="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-sm"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-ink-950/70 to-ink-950" />

        <div className="relative mx-auto max-w-6xl px-4 pb-4 pt-[calc(2.5rem+env(safe-area-inset-top))] text-center sm:pb-6 sm:pt-20">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-indigo-200 ring-1 ring-white/10 sm:mb-4 sm:text-xs">
            <Clapperboard className="size-3.5" />
            Plataformas disponibles en Argentina
          </div>
          <h1 className="bg-gradient-to-br from-white to-indigo-200 bg-clip-text text-[2rem] font-extrabold leading-tight tracking-tight text-transparent sm:text-6xl">
            ¿Dónde la veo?
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400 sm:mt-3 sm:text-base">
            Buscá una película o serie y descubrí en qué plataforma podés verla, alquilarla o comprarla.
          </p>
        </div>
      </header>

      {/* Buscador: queda fijo arriba al scrollear */}
      <div className="sticky top-0 z-30 bg-ink-950/85 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-lg sm:pb-6">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            // En mobile, cierra el teclado al apretar "Buscar"
            e.currentTarget.querySelector('input')?.blur()
          }}
          className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 transition focus-within:bg-white/15 focus-within:ring-2 focus-within:ring-indigo-400"
        >
          {loading ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-indigo-300" />
          ) : (
            <Search className="size-5 shrink-0 text-zinc-400" />
          )}
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            // En pantallas táctiles no abrimos el teclado de entrada
            autoFocus={window.matchMedia('(hover: hover)').matches}
            placeholder="Ej: Matrix, Breaking Bad, Coco..."
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            className="w-full min-w-0 bg-transparent text-base text-white placeholder:text-zinc-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => changeQuery('')}
              aria-label="Limpiar búsqueda"
              className="-m-1.5 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </form>

        <div className="mx-auto mt-3 flex max-w-xl flex-wrap items-center justify-center gap-2">
          <div role="radiogroup" aria-label="Filtrar por tipo" className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ring-1 transition active:scale-95 ${
                  filter === f.key
                    ? 'bg-indigo-500 text-white ring-indigo-400'
                    : 'bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="relative flex items-center rounded-full bg-white/5 text-sm text-zinc-300 ring-1 ring-white/10 transition focus-within:ring-2 focus-within:ring-indigo-400 hover:bg-white/10">
            <ArrowUpDown className="pointer-events-none absolute left-3 size-3.5 text-zinc-400" />
            <span className="sr-only">Ordenar por</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="cursor-pointer appearance-none rounded-full bg-transparent py-1.5 pl-8 pr-4 font-medium focus:outline-none [&>option]:bg-ink-900"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {genres.length > 0 && (
            <label
              className={`relative flex items-center rounded-full text-sm ring-1 transition focus-within:ring-2 focus-within:ring-indigo-400 ${
                genre
                  ? 'bg-indigo-500 text-white ring-indigo-400'
                  : 'bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10'
              }`}
            >
              <Tags className={`pointer-events-none absolute left-3 size-3.5 ${genre ? 'text-white' : 'text-zinc-400'}`} />
              <span className="sr-only">Género</span>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="cursor-pointer appearance-none rounded-full bg-transparent py-1.5 pl-8 pr-4 font-medium focus:outline-none [&>option]:bg-ink-900 [&>option]:text-zinc-200"
              >
                <option value="">Todos los géneros</option>
                {genres.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* Resultados */}
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-3 sm:pt-0">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold sm:mb-5 sm:text-lg">
          {person ? (
            <>
              <button
                type="button"
                onClick={() => setPerson(null)}
                aria-label="Volver a los resultados"
                className="-ml-1.5 shrink-0 rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="size-5" />
              </button>
              {person.profile_path && (
                <img
                  src={`${IMG_BASE}/w92${person.profile_path}`}
                  alt=""
                  className="size-8 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                />
              )}
              <span className="truncate">
                {person.known_for_department === 'Directing' ? 'Dirigidas por' : 'Títulos de'} {person.name}
              </span>
            </>
          ) : isSearching ? (
            <>
              <Search className="size-5 shrink-0 text-indigo-400" />
              <span className="truncate">Resultados para “{query.trim()}”</span>
            </>
          ) : genreInfo ? (
            <>
              <Tags className="size-5 text-indigo-400" />
              Explorar: {genreInfo.label}
            </>
          ) : (
            <>
              <TrendingUp className="size-5 text-indigo-400" />
              Tendencias de la semana
            </>
          )}
        </h2>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
            {error}
          </div>
        )}

        {showPeople && <PersonRow people={people} onSelect={setPerson} />}

        {noResults && (
          <div className="flex flex-col items-center gap-3 py-20 text-zinc-500">
            <SearchX className="size-12" />
            <p>{noResultsMessage}</p>
          </div>
        )}

        <ul className="grid grid-cols-2 gap-x-3 gap-y-5 min-[420px]:grid-cols-3 sm:gap-x-4 sm:gap-y-6 md:grid-cols-4 lg:grid-cols-5">
          {showSkeletons
            ? Array.from({ length: 10 }, (_, i) => <MovieCardSkeleton key={i} />)
            : movies.map((movie, i) => (
                // Una película y una serie pueden tener el mismo id en TMDB
                <MovieCard key={`${movie.media_type}-${movie.id}`} movie={movie} index={i} onSelect={setSelected} />
              ))}
        </ul>
      </main>

      <footer className="border-t border-white/5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 text-center text-xs text-zinc-600">
        Datos provistos por TMDB y JustWatch
      </footer>

      {selected && <MovieModal movie={selected} onClose={closeModal} />}
    </div>
  )
}

export default App
