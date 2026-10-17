import { useEffect, useState } from 'react'
import { CalendarClock, Unlock } from 'lucide-react'
import { useSwapyStore } from '../../store/useSwapyStore'
import Avatar from '../Avatar'
import { formatDuration } from '../user/ui'

// Reservas activas de toda la red, con la cuenta de Google de cada repartidor.
export default function ReservationsPanel({ onSelect }) {
  const reservations = useSwapyStore((s) => s.reservations)
  const users = useSwapyStore((s) => s.users)
  const stations = useSwapyStore((s) => s.stations)
  const batteries = useSwapyStore((s) => s.batteries)
  const cancelReservation = useSwapyStore((s) => s.cancelReservation)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const rows = [...reservations].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock size={18} className="text-sky-300" />
        <h2 className="font-bold">Reservas activas</h2>
        <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs font-semibold text-sky-300">{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No hay baterías reservadas en este momento.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-500">
                <th className="pb-2 font-medium">Repartidor (Google)</th>
                <th className="pb-2 font-medium">Estación · Casillero</th>
                <th className="pb-2 font-medium">Batería</th>
                <th className="pb-2 font-medium">Código</th>
                <th className="pb-2 font-medium">Vence en</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => {
                const u = users.find((x) => x.id === r.userId)
                const st = stations.find((s) => s.id === r.stationId)
                const b = batteries.find((x) => x.id === r.batteryId)
                const left = r.expiresAt - now
                return (
                  <tr key={r.token} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => onSelect?.(r.stationId, r.batteryId)}>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        {u && <Avatar user={u} size="sm" />}
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{u?.name ?? 'Usuario'}</p>
                          <p className="truncate text-xs text-slate-400">{u?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <p>{st?.name.replace('Swapy ', '')}</p>
                      <p className="text-xs text-slate-400">Casillero {r.lockerId}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-mono text-xs">{r.batteryId}</p>
                      {b && <p className="text-xs text-slate-400">{Math.round(b.soc)}% · SoH {b.soh}%</p>}
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs tracking-wider">{r.token}</td>
                    <td className={`py-3 pr-3 font-mono ${left < 120000 ? 'text-amber-300' : 'text-slate-200'}`}>{formatDuration(left)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); cancelReservation(r.userId) }}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-rose-400/40 hover:text-rose-300"
                      >
                        <Unlock size={12} /> Liberar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
