import { ChevronDown } from 'lucide-react'

// Un <select> nativo con forma de píldora. El select va invisible encima del
// texto: así el ancho se ajusta a la opción elegida (un select nativo siempre
// mide lo que su opción más larga) y se sigue usando el desplegable del sistema.
export function PillSelect({ icon: Icon, label, value, options, onChange, active = false }) {
  const current = options.find((o) => o.value === value)
  return (
    <label
      className={`relative flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 pl-3 pr-2.5 text-sm font-medium ring-1 transition focus-within:ring-2 focus-within:ring-indigo-400 active:scale-95 ${
        active
          ? 'bg-indigo-500 text-white ring-indigo-400'
          : 'bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className={`size-3.5 shrink-0 ${active ? 'text-white' : 'text-zinc-400'}`} />
      <span className="whitespace-nowrap">{current?.label}</span>
      <ChevronDown className="size-3.5 shrink-0 opacity-70" />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0 [&>option]:bg-ink-900 [&>option]:text-zinc-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
