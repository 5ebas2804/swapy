// Helpers visuales compartidos por la vista de usuario.

export const socColor = (soc) =>
  soc >= 80 ? 'bg-swapy-400' : soc >= 40 ? 'bg-amber-400' : 'bg-rose-500'

export const socText = (soc) =>
  soc >= 80 ? 'text-swapy-400' : soc >= 40 ? 'text-amber-400' : 'text-rose-400'

export const LOCKER_STYLES = {
  ready: { label: 'Lista', box: 'border-swapy-400/40 bg-swapy-400/10', dot: 'bg-swapy-400' },
  charging: { label: 'Cargando', box: 'border-amber-400/30 bg-amber-400/5', dot: 'bg-amber-400' },
  reserved: { label: 'Reservada', box: 'border-sky-400/40 bg-sky-400/10', dot: 'bg-sky-400' },
  locked: { label: 'Bloqueada', box: 'border-rose-500/50 bg-rose-500/10', dot: 'bg-rose-500' },
  empty: { label: 'Vacío', box: 'border-white/5 bg-white/[0.02]', dot: 'bg-slate-600' },
}

export const cop = (n) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('es-CO')}`

export const formatDuration = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
