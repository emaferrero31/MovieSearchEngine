import { useCallback, useEffect, useState } from 'react'
import { Clapperboard, Loader2, Search, SearchX, TrendingUp, X } from 'lucide-react'
import { IMG_BASE, getTrending, searchMovies } from './api'
import { MovieCard, MovieCardSkeleton } from './components/MovieCard'
import { MovieModal } from './components/MovieModal'

const CONNECTION_ERROR = 'No se pudo conectar con el servidor. ¿Está corriendo el backend?'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getTrending()
      .then((data) => setTrending(data.results || []))
      .catch(() => setError(CONNECTION_ERROR))
  }, [])

  // Búsqueda mientras se escribe, con debounce
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const data = await searchMovies(q)
        if (!cancelled) {
          setResults(data.results || [])
          setError(null)
        }
      } catch {
        if (!cancelled) setError(CONNECTION_ERROR)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  const closeModal = useCallback(() => setSelected(null), [])

  const isSearching = query.trim() !== ''
  const movies = isSearching ? results || [] : trending
  const featured = trending.find((m) => m.backdrop_path)
  const showSkeletons = (isSearching && loading) || (!isSearching && !trending.length && !error)

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
            Buscá una película y descubrí en qué plataforma podés verla, alquilarla o comprarla.
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
            placeholder="Ej: Matrix, Oppenheimer, Coco..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-w-0 bg-transparent text-base text-white placeholder:text-zinc-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="-m-1.5 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </form>
      </div>

      {/* Resultados */}
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-3 sm:pt-0">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold sm:mb-5 sm:text-lg">
          {isSearching ? (
            <>
              <Search className="size-5 shrink-0 text-indigo-400" />
              <span className="truncate">Resultados para “{query.trim()}”</span>
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

        {isSearching && !loading && results?.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-zinc-500">
            <SearchX className="size-12" />
            <p>No encontramos películas con ese nombre.</p>
          </div>
        )}

        <ul className="grid grid-cols-2 gap-x-3 gap-y-5 min-[420px]:grid-cols-3 sm:gap-x-4 sm:gap-y-6 md:grid-cols-4 lg:grid-cols-5">
          {showSkeletons
            ? Array.from({ length: 10 }, (_, i) => <MovieCardSkeleton key={i} />)
            : movies.map((movie, i) => (
                <MovieCard key={movie.id} movie={movie} index={i} onSelect={setSelected} />
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
