import { Film, Star } from 'lucide-react'
import { IMG_BASE } from '../api'

export function Rating({ value, className = '' }) {
  if (!value) return null
  const color =
    value >= 7 ? 'text-emerald-400' : value >= 5 ? 'text-amber-400' : 'text-rose-400'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold backdrop-blur ${color} ${className}`}
    >
      <Star className="size-3 fill-current" />
      {value.toFixed(1)}
    </span>
  )
}

export function MovieCard({ movie, index, onSelect }) {
  const year = movie.release_date?.slice(0, 4)

  return (
    <li className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 20) * 30}ms` }}>
      <button
        onClick={() => onSelect(movie)}
        className="group block w-full text-left focus:outline-none"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ink-800 ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-indigo-500/20 group-hover:ring-indigo-400/50 group-focus-visible:ring-2 group-focus-visible:ring-indigo-400">
          {movie.poster_path ? (
            <img
              src={`${IMG_BASE}/w342${movie.poster_path}`}
              alt={movie.title}
              loading="lazy"
              className="size-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-zinc-600">
              <Film className="size-10" />
              <span className="text-xs">Sin póster</span>
            </div>
          )}
          <Rating value={movie.vote_average} className="absolute left-2 top-2" />
          {movie.media_type === 'tv' && (
            <span className="absolute right-2 top-2 rounded-full bg-indigo-500/90 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
              Serie
            </span>
          )}
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/90 via-black/20 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
            <span className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white">
              ¿Dónde verla?
            </span>
          </div>
        </div>
        <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-zinc-100">{movie.title}</h3>
        <p className="text-xs text-zinc-500">{year || 'Sin fecha'}</p>
      </button>
    </li>
  )
}

export function MovieCardSkeleton() {
  return (
    <li className="animate-pulse">
      <div className="aspect-[2/3] rounded-xl bg-ink-800" />
      <div className="mt-2 h-3.5 w-3/4 rounded bg-ink-800" />
      <div className="mt-1.5 h-3 w-1/4 rounded bg-ink-800" />
    </li>
  )
}
