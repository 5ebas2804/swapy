import { create } from 'zustand'
import { ACCOUNTS, BATTERIES, PRICING, SAFETY, SEED_RESERVATIONS, STATIONS } from '../data/mockData'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const jitter = (amp) => (Math.random() - 0.5) * 2 * amp
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d
const rand = (n, chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') =>
  Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

export const RESERVATION_MIN = 15
const RESERVATION_MS = RESERVATION_MIN * 60 * 1000
const HISTORY_LEN = 60 // 60 lecturas × 500 ms = últimos 30 s

// Slices compartidos entre pestañas (ver sync.js). La sesión y el último intercambio son por pestaña.
export const SHARED_KEYS = ['users', 'batteries', 'reservations', 'cancelled', 'events', 'history']

// ---------- sesión (por pestaña) ----------
const SESSION_KEY = 'swapy-session'
const loadSession = () => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null }
}
const saveSession = (session) => {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch { /* almacenamiento no disponible: la sesión vive solo en memoria */ }
}

const makeEvent = (level, message, extra = {}) => {
  const at = Date.now()
  return { id: `${level}-${at}-${rand(4)}`, at, level, message, ...extra }
}
const pushEvents = (events, ...items) => [...items, ...events].slice(0, 60)

const appendHistory = (history, batteries, t) => {
  const next = {}
  for (const b of batteries) {
    const prev = history[b.id] ?? []
    next[b.id] = [...prev.slice(-(HISTORY_LEN - 1)), { t, temp: b.temp, soc: b.soc, cells: b.cells }]
  }
  return next
}

// Voltajes de celda "sanos" para un SoC dado (escala lineal 3.7–4.2 V).
const healthyCells = (soc) => {
  const base = SAFETY.CELL_V_MIN + (SAFETY.CELL_V_MAX - SAFETY.CELL_V_MIN) * (soc / 100)
  return [0, 1, 2, 3].map(() => round(base + jitter(0.005), 3))
}

const clearLock = { fault: null, isolatedCells: [], lockReason: null, lockType: null, faultInjectedAt: null, lockedAt: null }

function initialShared() {
  const now = Date.now()
  const reservations = SEED_RESERVATIONS.map(({ minutesAgo, ...r }) => ({
    ...r,
    createdAt: now - minutesAgo * 60000,
    expiresAt: now - minutesAgo * 60000 + RESERVATION_MS,
  }))
  const reserved = new Set(reservations.map((r) => r.batteryId))
  return {
    users: ACCOUNTS,
    batteries: BATTERIES.map((b) => (reserved.has(b.id) ? { ...b, status: 'reserved' } : b)),
    reservations, // reservas activas de todos los repartidores
    cancelled: {}, // { [userId]: reserva invalidada por el sistema u operador, con reason }
    events: [], // bitácora IoT (más reciente primero)
    history: {}, // { [batteryId]: [{ t, temp, soc, cells }] } para las gráficas del admin
  }
}

// Quita las reservas de baterías que ya no se pueden entregar y deja el aviso al repartidor.
function dropReservations(reservations, cancelled, reasons /* { [batteryId]: mensaje } */) {
  const lost = reservations.filter((r) => reasons[r.batteryId])
  if (!lost.length) return { reservations, cancelled }
  const next = { ...cancelled }
  for (const r of lost) next[r.userId] = { ...r, reason: reasons[r.batteryId] }
  return { reservations: reservations.filter((r) => !reasons[r.batteryId]), cancelled: next }
}

let telemetryTimer = null

// Un paso de telemetría para una batería: aplica ruido, carga y fallas inyectadas.
function tickBattery(b) {
  let { soc, temp, cells } = b

  if (b.status === 'locked') {
    temp = Math.max(26, temp - 0.6) // se enfría tras el bloqueo
  } else if (b.fault === 'overheat') {
    temp = temp + 10 + Math.random() * 3 // cruza el umbral en ~3 lecturas (~1.5 s)
  } else {
    const target = b.status === 'charging' ? 34 : 27.5
    temp = temp + (target - temp) * 0.05 + jitter(0.25)
  }

  if (b.status === 'locked') {
    // casillero bloqueado: lecturas congeladas
  } else if (b.fault === 'undervoltage') {
    // una celda colapsa
    cells = cells.map((v, i) => (i === 2 ? Math.max(2.5, v - 0.4 - Math.random() * 0.15) : v + jitter(0.005)))
  } else {
    if (b.status === 'charging') soc = Math.min(100, soc + 0.15)
    const base = SAFETY.CELL_V_MIN + (SAFETY.CELL_V_MAX - SAFETY.CELL_V_MIN) * (soc / 100)
    cells = cells.map((v) => clamp(v + (base - v) * 0.3 + jitter(0.006), SAFETY.CELL_V_MIN, SAFETY.CELL_V_MAX))
  }

  let status = b.status
  if (status === 'charging' && soc >= 90) status = 'ready'

  return { ...b, soc: round(soc, 1), temp: round(temp, 1), cells: cells.map((v) => round(v, 3)), status }
}

// Regla de seguridad del "firmware": si algo cruza el umbral crítico, bloquear el casillero.
function applySafety(b, now) {
  if (b.status === 'locked') return { battery: b, event: null }
  const minCell = Math.min(...b.cells)
  let reason = null
  if (b.temp >= SAFETY.TEMP_CRITICAL) reason = `Sobrecalentamiento ${b.temp.toFixed(1)} °C`
  else if (minCell <= SAFETY.CELL_V_CRITICAL) reason = `Caída de voltaje: celda en ${minCell.toFixed(2)} V`
  if (!reason) return { battery: b, event: null }

  const locked = { ...b, status: 'locked', lockType: 'auto', lockReason: reason, lockedAt: now }
  return {
    battery: locked,
    event: {
      id: `${b.id}-${now}`,
      at: now,
      level: 'critical',
      batteryId: b.id,
      stationId: b.stationId,
      lockerId: b.lockerId,
      message: `Casillero ${b.lockerId} bloqueado preventivamente · ${reason}`,
      latencyMs: b.faultInjectedAt ? now - b.faultInjectedAt : null,
    },
  }
}

export const useSwapyStore = create((set, get) => ({
  stations: STATIONS,
  ...initialShared(),
  session: loadSession(), // { userId, role: 'rider' | 'admin' }
  lastSwap: null, // { token, stationId, lockerId, newBattery, oldBattery, durationMs, charged }
  telemetryRunning: false,

  // ---------- Cuenta (Google simulado) ----------
  login: (userId, role) => {
    const session = { userId, role }
    saveSession(session)
    set({ session })
  },

  logout: () => {
    saveSession(null)
    set({ session: null, lastSwap: null })
  },

  // "Registro con Google": crea la cuenta sin verificar si el correo no existe.
  registerAccount: ({ name, email }) => {
    const existing = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (existing) return existing
    const user = {
      id: `u-${rand(6, 'abcdefghijkmnpqrstuvwxyz23456789')}`,
      name,
      email,
      avatar: 'from-violet-400 to-fuchsia-500',
      roles: ['rider'],
      verified: false,
      balance: 0,
      swapsThisMonth: 0,
      coords: { lat: 4.6425, lng: -74.0655 },
      currentBattery: { id: `SWP-B-0${rand(3, '0123456789')}`, soc: 35, soh: 92, temp: 29.8, cycles: 310, cells: [3.88, 3.87, 3.88, 3.89] },
      transactions: [],
    }
    set((s) => ({ users: [...s.users, user] }))
    return user
  },

  verifyAccount: (userId, { phone, documentId, vehicle }) => {
    const bonus = PRICING.WELCOME_BONUS_COP
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              verified: true,
              phone,
              documentId,
              vehicle,
              balance: u.balance + bonus,
              transactions: [{ id: `tx-${Date.now()}`, type: 'bonus', amount: bonus, at: Date.now(), detail: 'Bono de bienvenida' }, ...u.transactions],
            }
          : u,
      ),
      events: pushEvents(s.events, makeEvent('success', `Nueva cuenta verificada: ${s.users.find((u) => u.id === userId)?.email}`)),
    }))
  },

  // ---------- Billetera ----------
  topUp: (amount, method) => {
    const userId = get().session?.userId
    const now = Date.now()
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId
          ? { ...u, balance: u.balance + amount, transactions: [{ id: `tx-${now}`, type: 'topup', amount, method, at: now, detail: 'Recarga' }, ...u.transactions] }
          : u,
      ),
    }))
  },

  // ---------- Vista Usuario ----------
  reserveBattery: (stationId) => {
    const { session, users, reservations, batteries } = get()
    const user = users.find((u) => u.id === session?.userId)
    if (!user) return { error: 'NO_SESSION' }
    if (reservations.some((r) => r.userId === user.id)) return { error: 'HAS_RESERVATION' }
    if (user.balance < PRICING.SWAP_COP) return { error: 'NO_FUNDS' }

    const candidate = batteries
      .filter((b) => b.stationId === stationId && b.status === 'ready')
      .sort((a, b) => b.soc - a.soc || b.soh - a.soh)[0]
    if (!candidate) return { error: 'NO_BATTERIES' }

    const now = Date.now()
    const reservation = {
      token: `SWP-${rand(6)}`,
      userId: user.id,
      batteryId: candidate.id,
      stationId,
      lockerId: candidate.lockerId,
      createdAt: now,
      expiresAt: now + RESERVATION_MS,
    }
    const { [user.id]: _, ...cancelled } = get().cancelled
    set((s) => ({
      reservations: [...s.reservations, reservation],
      cancelled,
      batteries: s.batteries.map((b) => (b.id === candidate.id ? { ...b, status: 'reserved' } : b)),
      events: pushEvents(s.events, makeEvent('info', `${user.email} reservó ${candidate.id} · casillero ${candidate.lockerId}`, {
        batteryId: candidate.id, stationId, lockerId: candidate.lockerId,
      })),
    }))
    return { reservation }
  },

  // Sin userId: el repartidor cancela la suya. Con userId: el operador libera la reserva de otro.
  cancelReservation: (userId) => {
    const byOperator = !!userId
    const uid = userId ?? get().session?.userId
    const r = get().reservations.find((x) => x.userId === uid)
    if (!r) return
    const email = get().users.find((u) => u.id === uid)?.email
    set((s) => ({
      reservations: s.reservations.filter((x) => x !== r),
      cancelled: byOperator ? { ...s.cancelled, [uid]: { ...r, reason: 'Reserva liberada por el operador de Swapy' } } : s.cancelled,
      batteries: s.batteries.map((b) => (b.id === r.batteryId && b.status === 'reserved' ? { ...b, status: 'ready' } : b)),
      events: pushEvents(s.events, makeEvent('info', byOperator ? `Operador liberó la reserva ${r.token} de ${email}` : `${email} canceló la reserva ${r.token}`, {
        batteryId: r.batteryId, stationId: r.stationId, lockerId: r.lockerId,
      })),
    }))
  },

  dismissCancelled: () => {
    const { [get().session?.userId]: _, ...rest } = get().cancelled
    set({ cancelled: rest })
  },

  // Simula la lectura del QR en el casillero: el repartidor deja su batería descargada
  // en el mismo casillero (queda cargando), se lleva la reservada y se cobra el intercambio.
  completeSwap: () => {
    const { session, users, reservations, batteries, stations } = get()
    const user = users.find((u) => u.id === session?.userId)
    const r = reservations.find((x) => x.userId === user?.id)
    if (!r) return null
    const taken = batteries.find((b) => b.id === r.batteryId)
    const now = Date.now()
    const old = user.currentBattery
    const deposited = { ...taken, ...old, status: 'charging', ...clearLock }
    const stationName = stations.find((s) => s.id === r.stationId)?.name
    const lastSwap = {
      token: r.token,
      stationId: r.stationId,
      lockerId: r.lockerId,
      newBattery: { id: taken.id, soc: taken.soc, soh: taken.soh },
      oldBattery: { id: old.id, soc: old.soc },
      durationMs: now - r.createdAt,
      charged: PRICING.SWAP_COP,
      at: now,
    }
    set((s) => ({
      reservations: s.reservations.filter((x) => x !== r),
      lastSwap,
      users: s.users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              balance: u.balance - PRICING.SWAP_COP,
              swapsThisMonth: u.swapsThisMonth + 1,
              currentBattery: { id: taken.id, soc: taken.soc, soh: taken.soh, temp: taken.temp, cycles: taken.cycles + 1, cells: taken.cells },
              transactions: [{ id: `tx-${now}`, type: 'swap', amount: -PRICING.SWAP_COP, at: now, detail: `Intercambio · ${stationName}` }, ...u.transactions],
            }
          : u,
      ),
      batteries: s.batteries.map((b) => (b.id === taken.id ? deposited : b)),
      events: pushEvents(s.events, makeEvent('success', `Intercambio en ${r.lockerId} por ${user.email}: sale ${taken.id}, entra ${old.id}`, {
        batteryId: taken.id, stationId: r.stationId, lockerId: r.lockerId,
      })),
    }))
    return lastSwap
  },

  // ---------- Telemetría simulada (solo la corre la pestaña líder, ver sync.js) ----------
  startTelemetry: () => {
    if (telemetryTimer) return
    telemetryTimer = setInterval(() => {
      const now = Date.now()
      const s = get()
      const newEvents = []
      const reasons = {}
      let batteries = s.batteries.map((b) => {
        const { battery, event } = applySafety(tickBattery(b), now)
        if (event) {
          newEvents.push(event)
          reasons[b.id] = event.message
        }
        return battery
      })

      // reservas vencidas: la batería vuelve a quedar disponible
      const expired = s.reservations.filter((r) => r.expiresAt <= now)
      if (expired.length) {
        const ids = new Set(expired.map((r) => r.batteryId))
        batteries = batteries.map((b) => (ids.has(b.id) && b.status === 'reserved' ? { ...b, status: 'ready' } : b))
        expired.forEach((r) => newEvents.push(makeEvent('info', `Reserva ${r.token} venció sin usarse`, { batteryId: r.batteryId })))
      }
      const active = expired.length ? s.reservations.filter((r) => r.expiresAt > now) : s.reservations

      set({
        batteries,
        history: appendHistory(s.history, batteries, now),
        ...dropReservations(active, s.cancelled, reasons),
        events: newEvents.length ? pushEvents(s.events, ...newEvents) : s.events,
      })
    }, SAFETY.TELEMETRY_MS)
    set({ telemetryRunning: true })
  },

  stopTelemetry: () => {
    clearInterval(telemetryTimer)
    telemetryTimer = null
    set({ telemetryRunning: false })
  },

  // ---------- Panel de demostración / operador ----------
  injectFault: (batteryId, fault) => {
    const now = Date.now()
    set((s) => ({
      batteries: s.batteries.map((b) => (b.id === batteryId ? { ...b, fault, faultInjectedAt: now } : b)),
      events: pushEvents(s.events, makeEvent('warning', `Falla simulada: ${fault === 'overheat' ? 'sobrecalentamiento' : 'caída de voltaje'} en ${batteryId}`, { batteryId })),
    }))
  },

  // Bloqueo manual de un casillero completo por el operador.
  lockLocker: (batteryId, note) => {
    const actor = get().users.find((u) => u.id === get().session?.userId)?.email ?? 'operador'
    set((s) => {
      const b = s.batteries.find((x) => x.id === batteryId)
      if (!b || b.status === 'locked') return {}
      return {
        batteries: s.batteries.map((x) =>
          x.id === batteryId ? { ...x, status: 'locked', lockType: 'manual', lockReason: `Bloqueo manual · ${note}`, lockedAt: Date.now() } : x,
        ),
        ...dropReservations(s.reservations, s.cancelled, { [batteryId]: `Casillero ${b.lockerId} bloqueado por el operador (${note})` }),
        events: pushEvents(s.events, makeEvent('warning', `${actor} bloqueó el casillero ${b.lockerId} · ${note}`, {
          batteryId, stationId: b.stationId, lockerId: b.lockerId,
        })),
      }
    })
  },

  // Aísla un grupo de celdas: la batería queda fuera de servicio hasta revisión.
  isolateCell: (batteryId, cellIndex) => {
    const actor = get().users.find((u) => u.id === get().session?.userId)?.email ?? 'operador'
    set((s) => {
      const b = s.batteries.find((x) => x.id === batteryId)
      if (!b || b.isolatedCells.includes(cellIndex)) return {}
      const isolatedCells = [...b.isolatedCells, cellIndex].sort()
      const label = isolatedCells.map((i) => i + 1).join(', ')
      return {
        batteries: s.batteries.map((x) =>
          x.id === batteryId
            ? { ...x, isolatedCells, status: 'locked', lockType: x.lockType ?? 'manual', lockReason: `Celda${isolatedCells.length > 1 ? 's' : ''} ${label} aislada${isolatedCells.length > 1 ? 's' : ''} por el operador`, lockedAt: x.lockedAt ?? Date.now() }
            : x,
        ),
        ...dropReservations(s.reservations, s.cancelled, { [batteryId]: `Batería ${b.id} retirada de servicio por el operador` }),
        events: pushEvents(s.events, makeEvent('warning', `${actor} aisló la celda ${cellIndex + 1} de ${b.id} (${b.lockerId})`, {
          batteryId, stationId: b.stationId, lockerId: b.lockerId,
        })),
      }
    })
  },

  // Un técnico inspecciona y rehabilita el casillero: se limpia la falla y vuelve a operar.
  resetBattery: (batteryId) => {
    set((s) => {
      const b = s.batteries.find((x) => x.id === batteryId)
      if (!b) return {}
      const restored = {
        ...b,
        ...clearLock,
        status: b.soc >= 90 ? 'ready' : 'charging',
        temp: Math.min(b.temp, 30),
        cells: healthyCells(b.soc),
      }
      return {
        batteries: s.batteries.map((x) => (x.id === batteryId ? restored : x)),
        events: pushEvents(s.events, makeEvent('success', `Casillero ${b.lockerId} rehabilitado tras inspección`, {
          batteryId, stationId: b.stationId, lockerId: b.lockerId,
        })),
      }
    })
  },

  resetDemo: () => set({ ...initialShared(), lastSwap: null }),
}))

// ---------- selectores ----------
export const useCurrentUser = () => useSwapyStore((s) => s.users.find((u) => u.id === s.session?.userId))
export const useMyReservation = () => useSwapyStore((s) => s.reservations.find((r) => r.userId === s.session?.userId))
export const useMyCancelled = () => useSwapyStore((s) => s.cancelled[s.session?.userId])
