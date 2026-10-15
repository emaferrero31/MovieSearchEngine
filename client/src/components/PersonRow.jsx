import { User } from 'lucide-react'
import { IMG_BASE } from '../api'

const DEPARTMENTS = {
  Acting: 'Actuación',
  Directing: 'Dirección',
  Writing: 'Guion',
  Production: 'Producción',
  Sound: 'Música',
}

export function PersonRow({ people, onSelect }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-zinc-400">Personas</h3>
      {/* Scroll horizontal; el margen negativo deja que llegue al borde en mobile */}
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {people.map((p) => (
          <li key={p.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(p)}
              className="group flex w-24 flex-col items-center gap-2 rounded-xl p-1 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <div className="size-20 overflow-hidden rounded-full bg-ink-800 ring-1 ring-white/10 transition group-hover:ring-2 group-hover:ring-indigo-400">
                {p.profile_path ? (
                  <img
                    src={`${IMG_BASE}/w185${p.profile_path}`}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-zinc-600">
                    <User className="size-8" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-semibold text-zinc-100">{p.name}</p>
                {p.known_for_department && (
                  <p className="text-[11px] text-zinc-500">
                    {DEPARTMENTS[p.known_for_department] || p.known_for_department}
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
