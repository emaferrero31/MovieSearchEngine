import { useEffect, useRef, useState } from 'react'
import { Clock, Calendar, ExternalLink, Play, Tv, X } from 'lucide-react'
import { IMG_BASE, getMovie, getProviders } from '../api'
import { Rating } from './MovieCard'

const GROUPS = [
  { key: 'flatrate', label: 'Streaming', hint: 'Incluida en la suscripción' },
  { key: 'rent', label: 'Alquiler', hint: 'Pago por ver' },
  { key: 'buy', label: 'Compra', hint: 'Para siempre' },
]

function ProviderGroup({ label, hint, items }) {
  if (!items?.length) return null
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <h4 className="text-sm font-semibold text-zinc-200">{label}</h4>
        <span className="text-xs text-zinc-500">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <div
            key={p.provider_id}
            className="flex items-center gap-2 rounded-xl bg-white/5 py-1 pl-1 pr-2.5 ring-1 ring-white/10 sm:py-1.5 sm:pl-1.5 sm:pr-3"
          >
            <img
              src={`${IMG_BASE}/w92${p.logo_path}`}
              alt=""
              className="size-7 rounded-lg sm:size-8"
            />
            <span className="text-xs text-zinc-200 sm:text-sm">{p.provider_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MovieModal({ movie, onClose }) {
  const [details, setDetails] = useState(null)
  const [providers, setProviders] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getMovie(movie.id), getProviders(movie.id)])
      .then(([d, p]) => {
        if (cancelled) return
        setDetails(d)
        setProviders(p)
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [movie.id])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const backdrop = movie.backdrop_path || details?.backdrop_path
  const trailer = details?.videos?.results?.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer',
  )
  const hasProviders = GROUPS.some((g) => providers?.[g.key]?.length)
  const loading = !error && (!details || !providers)
  const runtime = details?.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : null

  // Deslizar hacia abajo para cerrar (solo cuando el contenido está arriba de todo)
  const sheetRef = useRef(null)
  const drag = useRef(null)
  const [dragY, setDragY] = useState(0)

  const onTouchStart = (e) => {
    if (sheetRef.current.scrollTop > 0) return
    drag.current = e.touches[0].clientY
  }
  const onTouchMove = (e) => {
    if (drag.current === null) return
    const dy = e.touches[0].clientY - drag.current
    if (dy < 0 || sheetRef.current.scrollTop > 0) {
      drag.current = null
      setDragY(0)
      return
    }
    setDragY(dy)
  }
  const onTouchEnd = () => {
    if (drag.current === null) return
    drag.current = null
    if (dragY > 120) onClose()
    else setDragY(0)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-6"
      style={{ backgroundColor: dragY ? `rgb(0 0 0 / ${Math.max(0.3, 0.8 - dragY / 500)})` : undefined }}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={movie.title}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? 'none' : 'transform 0.25s ease-out',
        }}
        className="animate-slide-up relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-3xl bg-ink-900 shadow-2xl ring-1 ring-white/10 sm:rounded-2xl"
      >
        {/* Barra para arrastrar (mobile) */}
        <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2.5 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/40" />
        </div>

        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2.5 text-zinc-300 backdrop-blur transition hover:bg-black/80 hover:text-white sm:p-2"
        >
          <X className="size-5" />
        </button>

        <div className="relative h-44 sm:h-72">
          {backdrop && (
            <img
              src={`${IMG_BASE}/w1280${backdrop}`}
              alt=""
              className="size-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
        </div>

        <div className="relative -mt-20 flex gap-4 px-5 sm:-mt-24 sm:gap-5 sm:px-8">
          {movie.poster_path && (
            <img
              src={`${IMG_BASE}/w342${movie.poster_path}`}
              alt=""
              className="w-24 shrink-0 self-end rounded-xl shadow-2xl ring-1 ring-white/10 sm:w-36"
            />
          )}
          <div className="flex min-w-0 flex-col justify-end pb-1">
            <h2 className="text-xl font-extrabold leading-tight tracking-tight sm:text-3xl">{movie.title}</h2>
            {details?.tagline && (
              <p className="mt-1 text-sm italic text-zinc-400">{details.tagline}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-400 sm:mt-3 sm:gap-x-4 sm:text-sm">
              <Rating value={movie.vote_average} />
              {movie.release_date && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  {movie.release_date.slice(0, 4)}
                </span>
              )}
              {runtime && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {runtime}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5 sm:space-y-6 sm:px-8 sm:pb-8">
          {details?.genres?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {details.genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-300 ring-1 ring-indigo-400/30"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {(details?.overview || movie.overview) && (
            <p className="text-[15px] leading-relaxed text-zinc-300 sm:text-base">{details?.overview || movie.overview}</p>
          )}

          {trailer && (
            <a
              href={`https://www.youtube.com/watch?v=${trailer.key}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 active:scale-[0.98] sm:inline-flex sm:w-auto sm:py-2"
            >
              <Play className="size-4 fill-current" />
              Ver tráiler
            </a>
          )}

          <section className="rounded-2xl bg-ink-800/60 p-4 ring-1 ring-white/5 sm:p-5">
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <Tv className="size-5 text-indigo-400" />
              Dónde verla en Argentina
            </h3>

            {loading && (
              <div className="flex animate-pulse gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-9 w-28 rounded-xl bg-white/5 sm:h-11 sm:w-32" />
                ))}
              </div>
            )}
            {error && (
              <p className="text-sm text-rose-400">No pudimos cargar la información.</p>
            )}
            {!loading && !error && !hasProviders && (
              <p className="text-sm text-zinc-400">
                No está disponible en streaming, alquiler ni compra en Argentina por ahora.
              </p>
            )}
            {!loading && hasProviders && (
              <div className="space-y-5">
                {GROUPS.map((g) => (
                  <ProviderGroup key={g.key} {...g} items={providers[g.key]} />
                ))}
                {providers.link && (
                  <a
                    href={providers.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-indigo-300 hover:text-indigo-200"
                  >
                    Ver más detalles <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
