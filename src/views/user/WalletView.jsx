import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, CreditCard, Gift, Loader2, Plus, Wallet, X, Zap } from 'lucide-react'
import { useCurrentUser, useSwapyStore } from '../../store/useSwapyStore'
import { PAYMENT_METHODS, PRICING } from '../../data/mockData'
import { cop } from '../../components/user/ui'

const TX_STYLE = {
  topup: { icon: ArrowDownLeft, cls: 'bg-swapy-400/15 text-swapy-400' },
  bonus: { icon: Gift, cls: 'bg-violet-400/15 text-violet-300' },
  swap: { icon: Zap, cls: 'bg-white/5 text-slate-300' },
}

const when = (t) =>
  new Date(t).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

export default function WalletView() {
  const user = useCurrentUser()
  const [open, setOpen] = useState(false)
  const swapsLeft = Math.floor(user.balance / PRICING.SWAP_COP)

  return (
    <div className="px-5 pb-28 pt-8">
      <h1 className="mb-5 text-2xl font-extrabold">Billetera</h1>

      {/* saldo */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-swapy-400 to-emerald-500 p-5 text-ink-950">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20" />
        <p className="flex items-center gap-1.5 text-sm font-semibold opacity-80"><Wallet size={16} /> Saldo disponible</p>
        <p className="mt-1 text-4xl font-black tracking-tight">{cop(user.balance)}</p>
        <p className="mt-1 text-sm font-medium opacity-80">
          Alcanza para {swapsLeft} intercambio{swapsLeft === 1 ? '' : 's'} · {cop(PRICING.SWAP_COP)} c/u
        </p>
        <button
          onClick={() => setOpen(true)}
          className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 py-3 font-bold text-white transition active:scale-[0.98]"
        >
          <Plus size={18} /> Recargar saldo
        </button>
      </section>

      {/* movimientos */}
      <h2 className="mb-3 font-bold">Movimientos</h2>
      {user.transactions.length === 0 ? (
        <p className="rounded-2xl bg-white/[0.03] p-6 text-center text-sm text-slate-500">Aún no tienes movimientos.</p>
      ) : (
        <ul className="space-y-2">
          {user.transactions.map((t) => {
            const st = TX_STYLE[t.type]
            const method = PAYMENT_METHODS.find((m) => m.id === t.method)
            return (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${st.cls}`}><st.icon size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.detail}{method ? ` · ${method.label}` : ''}</p>
                  <p className="text-xs text-slate-500">{when(t.at)}</p>
                </div>
                <p className={`font-mono text-sm font-bold ${t.amount > 0 ? 'text-swapy-400' : 'text-slate-200'}`}>
                  {t.amount > 0 ? '+' : ''}{cop(t.amount)}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      {open && <TopUpSheet onClose={() => setOpen(false)} />}
    </div>
  )
}

function TopUpSheet({ onClose }) {
  const topUp = useSwapyStore((s) => s.topUp)
  const [amount, setAmount] = useState(PRICING.TOPUP_OPTIONS[1])
  const [custom, setCustom] = useState('')
  const [method, setMethod] = useState(PAYMENT_METHODS[0].id)
  const [phase, setPhase] = useState('form') // form | paying | done

  const value = custom ? Number(custom) : amount
  const valid = value >= 5000 && value <= 500000

  const pay = () => {
    setPhase('paying')
    setTimeout(() => {
      topUp(value, method)
      setPhase('done')
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={phase === 'paying' ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-[sheet-in_0.25s_ease-out] rounded-t-3xl border-t border-white/10 bg-ink-900 p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

        {phase === 'done' ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-swapy-400 text-ink-950"><Check size={32} /></div>
            <h2 className="text-xl font-bold">Recarga exitosa</h2>
            <p className="mt-1 text-slate-400">{cop(value)} vía {PAYMENT_METHODS.find((m) => m.id === method).label}</p>
            <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-swapy-400 py-3.5 font-bold text-ink-950">Listo</button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Recargar saldo</h2>
              <button onClick={onClose} disabled={phase === 'paying'} aria-label="Cerrar" className="rounded-full bg-white/5 p-2 text-slate-400"><X size={18} /></button>
            </div>

            <p className="mb-2 text-xs text-slate-400">Monto</p>
            <div className="mb-2 grid grid-cols-4 gap-2">
              {PRICING.TOPUP_OPTIONS.map((v) => (
                <button key={v} onClick={() => { setAmount(v); setCustom('') }}
                  className={`rounded-xl border py-2.5 text-sm font-bold ${!custom && amount === v ? 'border-swapy-400 bg-swapy-400/10 text-swapy-400' : 'border-white/10'}`}>
                  {v / 1000}k
                </button>
              ))}
            </div>
            <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric"
              placeholder="Otro monto (mín. $5.000)"
              className="mb-5 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-swapy-400" />

            <p className="mb-2 text-xs text-slate-400">Método de pago</p>
            <div className="mb-6 grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${method === m.id ? 'border-swapy-400 bg-white/5' : 'border-white/10'}`}>
                  <span className={`grid h-7 w-7 place-items-center rounded-lg text-white ${m.color}`}>
                    {m.id === 'card' ? <CreditCard size={14} /> : <ArrowUpRight size={14} />}
                  </span>
                  {m.label}
                </button>
              ))}
            </div>

            <button onClick={pay} disabled={!valid || phase === 'paying'}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-swapy-400 py-4 font-bold text-ink-950 disabled:bg-slate-700 disabled:text-slate-400">
              {phase === 'paying' ? <><Loader2 size={18} className="animate-spin" /> Procesando pago…</> : `Pagar ${valid ? cop(value) : ''}`}
            </button>
            <p className="mt-3 text-center text-[10px] text-slate-500">Pago simulado · no se realiza ningún cargo real</p>
          </>
        )}
      </div>
    </div>
  )
}
