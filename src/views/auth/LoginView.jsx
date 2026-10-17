import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Bike, Check, ChevronRight, Gift, IdCard, KeyRound, LayoutDashboard, Loader2, MessageSquare,
  ShieldAlert, ShieldCheck, Smartphone, UserPlus, Zap,
} from 'lucide-react'
import { useSwapyStore } from '../../store/useSwapyStore'
import { PRICING } from '../../data/mockData'
import Avatar from '../../components/Avatar'

const cop = (n) => `$${n.toLocaleString('es-CO')}`

// Flujo: bienvenida → elegir cuenta Google → elegir rol → verificación → entrar.
export default function LoginView() {
  const navigate = useNavigate()
  const session = useSwapyStore((s) => s.session)
  const users = useSwapyStore((s) => s.users)
  const login = useSwapyStore((s) => s.login)
  const registerAccount = useSwapyStore((s) => s.registerAccount)
  const verifyAccount = useSwapyStore((s) => s.verifyAccount)

  const [step, setStep] = useState('welcome')
  const [userId, setUserId] = useState(null)
  const user = users.find((u) => u.id === userId)

  const sessionUser = users.find((u) => u.id === session?.userId)
  if (sessionUser && step === 'welcome') return <Navigate to={session.role === 'admin' ? '/admin' : '/app'} replace />

  const enter = (role) => {
    login(userId, role)
    navigate(role === 'admin' ? '/admin' : '/app', { replace: true })
  }

  const chooseRole = (role) => {
    if (role === 'admin') setStep(user.roles.includes('admin') ? 'admin-2fa' : 'denied')
    else if (!user.roles.includes('rider')) setStep('denied-rider')
    else setStep(user.verified ? 'checking' : 'reg-phone')
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-[radial-gradient(ellipse_at_top,_#1a2347_0%,_#0b1020_60%)] px-4 py-10">
      <div className="w-full max-w-md">
        {step === 'welcome' && <Welcome onGoogle={() => setStep('chooser')} />}

        {step === 'chooser' && (
          <AccountChooser
            users={users}
            onBack={() => setStep('welcome')}
            onPick={(id) => { setUserId(id); setStep('role') }}
            onNew={() => setStep('new-account')}
          />
        )}

        {step === 'new-account' && (
          <NewAccount
            onBack={() => setStep('chooser')}
            onCreate={(data) => {
              const u = registerAccount(data)
              setUserId(u.id)
              setStep('role')
            }}
          />
        )}

        {step === 'role' && user && (
          <RolePicker user={user} onBack={() => setStep('chooser')} onPick={chooseRole} />
        )}

        {step === 'checking' && user && <Checking user={user} onDone={() => enter('rider')} />}

        {step === 'reg-phone' && user && (
          <RegisterFlow
            user={user}
            onBack={() => setStep('role')}
            onDone={(data) => { verifyAccount(user.id, data); setStep('registered') }}
          />
        )}

        {step === 'registered' && user && <Registered user={user} onEnter={() => enter('rider')} />}

        {step === 'admin-2fa' && user && (
          <AdminTwoFactor user={user} onBack={() => setStep('role')} onDone={() => enter('admin')} />
        )}

        {(step === 'denied' || step === 'denied-rider') && user && (
          <Denied user={user} admin={step === 'denied'} onBack={() => setStep('role')} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Card({ children, className = '' }) {
  return <div className={`rounded-3xl border border-white/10 bg-ink-900/90 p-6 shadow-2xl backdrop-blur ${className}`}>{children}</div>
}

function Back({ onClick }) {
  return (
    <button onClick={onClick} className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
      <ArrowLeft size={16} /> Atrás
    </button>
  )
}

function GoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function Welcome({ onGoogle }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-swapy-400 shadow-2xl shadow-swapy-400/30">
        <Zap size={40} className="text-ink-950" fill="currentColor" />
      </div>
      <h1 className="text-4xl font-black tracking-tight">Swapy</h1>
      <p className="mx-auto mt-2 max-w-xs text-slate-400">Cambia tu batería en menos de 2 minutos y sigue repartiendo.</p>

      <div className="my-8 grid grid-cols-3 gap-2 text-xs text-slate-300">
        {[['< 2 min', 'por intercambio'], ['24/7', 'estaciones IoT'], [cop(PRICING.SWAP_COP), 'por cambio']].map(([a, b]) => (
          <div key={b} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-base font-extrabold text-swapy-400">{a}</p>
            <p className="text-slate-500">{b}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-4 font-semibold text-slate-800 shadow-xl transition hover:bg-slate-100 active:scale-[0.98]"
      >
        <GoogleLogo size={22} /> Continuar con Google
      </button>
      <p className="mt-4 text-xs text-slate-500">¿Primera vez? Regístrate con tu cuenta de Google en el mismo paso.</p>
      <p className="mt-8 text-[10px] uppercase tracking-widest text-slate-600">Prototipo · inicio de sesión simulado</p>
    </div>
  )
}

function AccountChooser({ users, onBack, onPick, onNew }) {
  return (
    <>
      <Back onClick={onBack} />
      <div className="overflow-hidden rounded-3xl bg-white text-slate-800 shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5 text-center">
          <div className="mb-3 flex justify-center"><GoogleLogo size={28} /></div>
          <h2 className="text-xl font-medium">Elige una cuenta</h2>
          <p className="text-sm text-slate-500">para continuar a <span className="font-semibold text-slate-700">Swapy</span></p>
        </div>
        <ul>
          {users.map((u) => (
            <li key={u.id}>
              <button onClick={() => onPick(u.id)} className="flex w-full items-center gap-3 border-b border-slate-100 px-6 py-3 text-left hover:bg-slate-50">
                <Avatar user={u} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
                {u.roles.includes('admin') && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">ADMIN</span>}
              </button>
            </li>
          ))}
          <li>
            <button onClick={onNew} className="flex w-full items-center gap-3 px-6 py-3 text-left text-sm font-medium hover:bg-slate-50">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500"><UserPlus size={16} /></span>
              Usar otra cuenta
            </button>
          </li>
        </ul>
      </div>
    </>
  )
}

function NewAccount({ onBack, onCreate }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const valid = name.trim().length > 2 && /^[^\s@]+@gmail\.com$/i.test(email.trim())
  return (
    <>
      <Back onClick={onBack} />
      <div className="rounded-3xl bg-white p-6 text-slate-800 shadow-2xl">
        <div className="mb-4 flex justify-center"><GoogleLogo size={28} /></div>
        <h2 className="text-center text-xl font-medium">Inicia sesión</h2>
        <p className="mb-6 text-center text-sm text-slate-500">con tu cuenta de Google</p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (valid) onCreate({ name: name.trim(), email: email.trim().toLowerCase() }) }}
          className="space-y-3"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo"
            className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@gmail.com" type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600" />
          {email && !/@gmail\.com$/i.test(email.trim()) && <p className="text-xs text-rose-600">Usa una cuenta @gmail.com</p>}
          <button disabled={!valid} className="w-full rounded-full bg-sky-700 py-2.5 text-sm font-medium text-white disabled:bg-slate-300">
            Siguiente
          </button>
        </form>
      </div>
    </>
  )
}

function RolePicker({ user, onBack, onPick }) {
  const roles = [
    { id: 'rider', icon: Bike, title: 'Repartidor', desc: 'Reserva y cambia baterías en estaciones Swapy.', color: 'text-swapy-400 bg-swapy-400/15' },
    { id: 'admin', icon: LayoutDashboard, title: 'Administrador', desc: 'Monitorea la red IoT, reservas y casilleros.', color: 'text-sky-300 bg-sky-400/15' },
  ]
  return (
    <>
      <Back onClick={onBack} />
      <Card>
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
          <Avatar user={user} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          {user.verified && <ShieldCheck size={18} className="ml-auto shrink-0 text-swapy-400" aria-label="Verificada" />}
        </div>
        <h2 className="mb-1 text-xl font-bold">¿Cómo quieres entrar?</h2>
        <p className="mb-5 text-sm text-slate-400">Elige el tipo de acceso para esta sesión.</p>
        <div className="space-y-3">
          {roles.map((r) => (
            <button key={r.id} onClick={() => onPick(r.id)}
              className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/25 hover:bg-white/[0.06]">
              <span className={`grid h-12 w-12 place-items-center rounded-xl ${r.color}`}><r.icon size={24} /></span>
              <span className="flex-1">
                <span className="block font-bold">{r.title}</span>
                <span className="block text-xs text-slate-400">{r.desc}</span>
              </span>
              <ChevronRight size={18} className="text-slate-500" />
            </button>
          ))}
        </div>
      </Card>
    </>
  )
}

// Verificación rápida para cuentas ya registradas.
function Checking({ user, onDone }) {
  const checks = ['Cuenta de Google autenticada', 'Identidad verificada', 'Sin bloqueos ni deudas']
  const [done, setDone] = useState(0)
  useEffect(() => {
    if (done >= checks.length) {
      const t = setTimeout(onDone, 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setDone((d) => d + 1), 380)
    return () => clearTimeout(t)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card className="text-center">
      <Avatar user={user} size="lg" className="mx-auto mb-4" />
      <h2 className="text-lg font-bold">Hola, {user.name.split(' ')[0]}</h2>
      <p className="mb-6 text-sm text-slate-400">Verificando tu cuenta…</p>
      <ul className="space-y-2 text-left text-sm">
        {checks.map((c, i) => (
          <li key={c} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i < done ? 'bg-swapy-400/10 text-slate-200' : 'bg-white/[0.03] text-slate-500'}`}>
            {i < done ? <Check size={16} className="text-swapy-400" /> : <Loader2 size={16} className={i === done ? 'animate-spin' : 'opacity-0'} />}
            {c}
          </li>
        ))}
      </ul>
    </Card>
  )
}

const VEHICLES = ['Bicicleta eléctrica · 48V', 'Scooter eléctrico · 48V', 'Moto eléctrica · 48V']

// Registro de repartidor nuevo: celular + código SMS + identidad.
function RegisterFlow({ user, onBack, onDone }) {
  const [sub, setSub] = useState('phone') // phone | otp | id | verifying
  const [phone, setPhone] = useState('')
  const [sms, setSms] = useState(null)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState(false)
  const [doc, setDoc] = useState('')
  const [vehicle, setVehicle] = useState(VEHICLES[1])
  const [terms, setTerms] = useState(false)

  const stepNum = { phone: 1, otp: 2, id: 3, verifying: 3 }[sub]

  const sendCode = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setSms(code)
    setOtp('')
    setSub('otp')
  }

  const submitId = () => {
    setSub('verifying')
    setTimeout(() => onDone({ phone: `+57 ${phone}`, documentId: `CC ***${doc.slice(-4)}`, vehicle }), 1800)
  }

  return (
    <>
      {sub !== 'verifying' && <Back onClick={sub === 'phone' ? onBack : () => setSub(sub === 'id' ? 'otp' : 'phone')} />}

      {/* SMS simulado */}
      {sms && sub === 'otp' && (
        <div className="mb-4 flex animate-[alert-in_0.25s_ease-out] items-start gap-3 rounded-2xl bg-slate-100 p-3 text-slate-800 shadow-xl">
          <MessageSquare size={18} className="mt-0.5 text-slate-500" />
          <div className="text-sm">
            <p className="text-xs font-semibold text-slate-500">SMS · ahora</p>
            <p>Swapy: tu código de verificación es <b className="font-mono">{sms}</b></p>
          </div>
        </div>
      )}

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-slate-400">Registro de repartidor</p>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 w-6 rounded-full ${n <= stepNum ? 'bg-swapy-400' : 'bg-white/10'}`} />)}
          </div>
        </div>

        {sub === 'phone' && (
          <>
            <Smartphone className="mb-3 text-swapy-400" />
            <h2 className="text-xl font-bold">Verifica tu celular</h2>
            <p className="mb-5 text-sm text-slate-400">Te enviaremos un código por SMS.</p>
            <div className="flex overflow-hidden rounded-xl border border-white/15 focus-within:border-swapy-400">
              <span className="bg-white/5 px-3 py-3 text-slate-400">+57</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric"
                placeholder="300 123 4567" className="flex-1 bg-transparent px-3 font-mono outline-none" />
            </div>
            <button onClick={sendCode} disabled={phone.length !== 10} className="mt-5 w-full rounded-2xl bg-swapy-400 py-3.5 font-bold text-ink-950 disabled:bg-slate-700 disabled:text-slate-400">
              Enviar código
            </button>
          </>
        )}

        {sub === 'otp' && (
          <>
            <KeyRound className="mb-3 text-swapy-400" />
            <h2 className="text-xl font-bold">Ingresa el código</h2>
            <p className="mb-5 text-sm text-slate-400">Enviado al +57 {phone}</p>
            <CodeInput value={otp} onChange={(v) => { setOtp(v); setOtpError(false) }} error={otpError} />
            {otpError && <p className="mt-2 text-center text-xs text-rose-400">Código incorrecto</p>}
            <button onClick={() => (otp === sms ? setSub('id') : setOtpError(true))} disabled={otp.length !== 6}
              className="mt-5 w-full rounded-2xl bg-swapy-400 py-3.5 font-bold text-ink-950 disabled:bg-slate-700 disabled:text-slate-400">
              Verificar
            </button>
            <button onClick={sendCode} className="mt-2 w-full py-2 text-xs text-slate-400 hover:text-white">Reenviar código</button>
          </>
        )}

        {sub === 'id' && (
          <>
            <IdCard className="mb-3 text-swapy-400" />
            <h2 className="text-xl font-bold">Datos del repartidor</h2>
            <p className="mb-5 text-sm text-slate-400">Para habilitar el uso de las estaciones.</p>
            <label className="mb-1 block text-xs text-slate-400">Cédula de ciudadanía</label>
            <input value={doc} onChange={(e) => setDoc(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="1012345678"
              className="mb-4 w-full rounded-xl border border-white/15 bg-transparent px-3 py-3 font-mono outline-none focus:border-swapy-400" />
            <label className="mb-1 block text-xs text-slate-400">Vehículo</label>
            <div className="mb-4 grid gap-2">
              {VEHICLES.map((v) => (
                <button key={v} onClick={() => setVehicle(v)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm ${vehicle === v ? 'border-swapy-400 bg-swapy-400/10' : 'border-white/10'}`}>
                  {v}
                </button>
              ))}
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 accent-lime-400" />
              Acepto los términos del servicio y el tratamiento de datos personales (Ley 1581 de 2012).
            </label>
            <button onClick={submitId} disabled={doc.length < 6 || !terms}
              className="mt-5 w-full rounded-2xl bg-swapy-400 py-3.5 font-bold text-ink-950 disabled:bg-slate-700 disabled:text-slate-400">
              Verificar identidad
            </button>
          </>
        )}

        {sub === 'verifying' && (
          <div className="py-8 text-center">
            <Loader2 size={40} className="mx-auto mb-4 animate-spin text-swapy-400" />
            <h2 className="text-lg font-bold">Verificando identidad…</h2>
            <p className="text-sm text-slate-400">Validando documento con {user.email}</p>
          </div>
        )}
      </Card>
    </>
  )
}

function Registered({ user, onEnter }) {
  return (
    <Card className="text-center">
      <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-swapy-400 text-ink-950">
        <ShieldCheck size={40} />
      </div>
      <h2 className="text-2xl font-extrabold">¡Cuenta verificada!</h2>
      <p className="mt-1 text-sm text-slate-400">{user.email}</p>
      <div className="my-6 flex items-center gap-3 rounded-2xl border border-swapy-400/30 bg-swapy-400/10 p-4 text-left">
        <Gift className="text-swapy-400" />
        <div>
          <p className="font-bold">Bono de bienvenida</p>
          <p className="text-sm text-slate-300">{cop(PRICING.WELCOME_BONUS_COP)} cargados a tu billetera</p>
        </div>
      </div>
      <button onClick={onEnter} className="w-full rounded-2xl bg-swapy-400 py-4 font-bold text-ink-950">Empezar a usar Swapy</button>
    </Card>
  )
}

function AdminTwoFactor({ user, onBack, onDone }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)
  const submit = () => {
    if (code !== user.adminCode) return setError(true)
    setChecking(true)
    setTimeout(onDone, 900)
  }
  return (
    <>
      <Back onClick={onBack} />
      <Card>
        <ShieldCheck className="mb-3 text-sky-300" />
        <h2 className="text-xl font-bold">Verificación en dos pasos</h2>
        <p className="mb-5 text-sm text-slate-400">Acceso de administrador para {user.email}. Ingresa el código de tu app autenticadora.</p>
        <CodeInput value={code} onChange={(v) => { setCode(v); setError(false) }} error={error} />
        {error && <p className="mt-2 text-center text-xs text-rose-400">Código incorrecto</p>}
        <button onClick={submit} disabled={code.length !== 6 || checking}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-400 py-3.5 font-bold text-ink-950 disabled:bg-slate-700 disabled:text-slate-400">
          {checking ? <><Loader2 size={18} className="animate-spin" /> Verificando…</> : 'Entrar al panel'}
        </button>
        <p className="mt-4 rounded-xl bg-white/[0.04] p-2 text-center text-xs text-slate-500">Código de demo: <span className="font-mono text-slate-300">{user.adminCode}</span></p>
      </Card>
    </>
  )
}

function Denied({ user, admin, onBack }) {
  return (
    <>
      <Back onClick={onBack} />
      <Card className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-rose-500/15 text-rose-400"><ShieldAlert size={32} /></div>
        <h2 className="text-xl font-bold">Acceso no autorizado</h2>
        <p className="mt-2 text-sm text-slate-400">
          {admin
            ? <><span className="text-slate-200">{user.email}</span> no tiene permisos de administrador. Solicita acceso al equipo de operaciones.</>
            : <>Esta es una cuenta de operaciones; no puede usarse como repartidor.</>}
        </p>
        <button onClick={onBack} className="mt-6 w-full rounded-2xl border border-white/15 py-3 font-semibold">Elegir otro acceso</button>
      </Card>
    </>
  )
}

function CodeInput({ value, onChange, error }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      autoFocus
      placeholder="••••••"
      className={`w-full rounded-xl border bg-transparent py-4 text-center font-mono text-3xl tracking-[0.5em] outline-none ${
        error ? 'border-rose-500' : 'border-white/15 focus:border-swapy-400'
      }`}
    />
  )
}
