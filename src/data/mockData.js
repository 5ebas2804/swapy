// Datos simulados (mock) para el prototipo. Nada de esto viene de un backend real.

// Umbrales de seguridad del BMS simulado (TP4056 + ESP32, celdas Li-ion 18650).
export const SAFETY = {
  CELL_V_MIN: 3.7, // rango normal de operación
  CELL_V_MAX: 4.2,
  CELL_V_CRITICAL: 3.0, // por debajo: caída de voltaje → bloqueo
  TEMP_WARN: 45, // °C
  TEMP_CRITICAL: 60, // °C: sobrecalentamiento → bloqueo
  TELEMETRY_MS: 500, // frecuencia de muestreo simulada
}

// Sensor físico del prototipo (ESP32 + INA219 + LM35 + RC522, carpeta "BSS Swapy").
// El firmware publica por MQTT a un broker público y la app se suscribe por WebSocket seguro.
// Mientras no lleguen lecturas, el casillero sigue simulado como los demás.
export const LIVE_SENSOR = {
  BATTERY_ID: 'SWP-B-0101', // casillero Chapinero L1
  BROKER_URL: 'wss://broker.hivemq.com:8884/mqtt',
  TOPIC: 'swapy-5ebas2804/ST-CHA-01/L1', // + /telemetry, /rfid, /status (igual que en el firmware)
  SERIES_CELLS: 1, // celdas en serie que mide el INA219 (1 = una sola 18650)
  STALE_MS: 5000, // sin lecturas por 5 s → el casillero vuelve a simulación
  MIN_PRESENT_V: 0.5, // por debajo: no hay batería conectada al INA219
}

// Etiquetas RFID conocidas → batería. Agrega aquí el UID que muestra el monitor serial.
export const RFID_TAGS = {
  // 'A1:B2:C3:D4': 'SWP-B-0101',
}

export const PRICING = {
  SWAP_COP: 4500, // costo por intercambio
  WELCOME_BONUS_COP: 5000, // bono al verificar una cuenta nueva
  TOPUP_OPTIONS: [10000, 20000, 50000, 100000],
}

// Especificación del paquete de baterías (igual para toda la flota).
export const PACK_SPEC = {
  nominalV: 48,
  capacityAh: 20,
  capacityWh: 960,
  chemistry: 'Li-ion NMC · 18650',
  config: '13S6P · 4 grupos monitoreados',
  kmPerSoc: 0.6, // autonomía aproximada por cada 1 % de carga
}

export const PAYMENT_METHODS = [
  { id: 'nequi', label: 'Nequi', color: 'bg-fuchsia-600' },
  { id: 'daviplata', label: 'Daviplata', color: 'bg-red-600' },
  { id: 'pse', label: 'PSE', color: 'bg-sky-700' },
  { id: 'card', label: 'Tarjeta', color: 'bg-slate-600' },
]

const riderBattery = (id, soc, soh, temp, cycles, cells) => ({ id, soc, soh, temp, cycles, cells })

const tx = (id, type, amount, minutesAgo, detail, method) => ({ id, type, amount, at: Date.now() - minutesAgo * 60000, detail, method })

// Cuentas de Google simuladas. roles: quién puede entrar a qué vista.
export const ACCOUNTS = [
  {
    id: 'u-camila',
    name: 'Camila Rojas',
    email: 'camila.rojas.delivery@gmail.com',
    avatar: 'from-pink-400 to-rose-500',
    roles: ['rider'],
    verified: true,
    phone: '+57 310 555 0142',
    documentId: 'CC ***4821',
    vehicle: 'Scooter eléctrico · 48V',
    balance: 12000,
    swapsThisMonth: 37,
    coords: { lat: 4.6418, lng: -74.0662 },
    currentBattery: riderBattery('SWP-B-0099', 14, 90, 31.5, 420, [3.74, 3.75, 3.73, 3.74]),
    transactions: [
      tx('t1', 'swap', -4500, 260, 'Intercambio · Swapy Zona T'),
      tx('t2', 'topup', 20000, 1500, 'Recarga', 'nequi'),
      tx('t3', 'swap', -4500, 1620, 'Intercambio · Swapy Chapinero'),
    ],
  },
  {
    id: 'u-andres',
    name: 'Andrés Gómez',
    email: 'andres.gomez.rappi@gmail.com',
    avatar: 'from-sky-400 to-indigo-500',
    roles: ['rider'],
    verified: true,
    phone: '+57 315 555 0199',
    documentId: 'CC ***7730',
    vehicle: 'Bicicleta eléctrica · 48V',
    balance: 27500,
    swapsThisMonth: 52,
    coords: { lat: 4.6655, lng: -74.0560 },
    currentBattery: riderBattery('SWP-B-0087', 22, 88, 30.1, 512, [3.79, 3.78, 3.8, 3.79]),
    transactions: [tx('t1', 'topup', 50000, 3000, 'Recarga', 'pse')],
  },
  {
    id: 'u-valentina',
    name: 'Valentina Pérez',
    email: 'vale.perez.moto@gmail.com',
    avatar: 'from-amber-300 to-orange-500',
    roles: ['rider'],
    verified: true,
    phone: '+57 301 555 0177',
    documentId: 'CC ***1906',
    vehicle: 'Moto eléctrica · 48V',
    balance: 8000,
    swapsThisMonth: 19,
    coords: { lat: 4.6470, lng: -74.0610 },
    currentBattery: riderBattery('SWP-B-0076', 9, 84, 32.4, 601, [3.71, 3.7, 3.72, 3.71]),
    transactions: [tx('t1', 'topup', 20000, 4000, 'Recarga', 'daviplata')],
  },
  {
    id: 'u-ops',
    name: 'Operaciones Swapy',
    email: 'ops.swapy.demo@gmail.com',
    avatar: 'from-lime-300 to-emerald-500',
    roles: ['admin'],
    verified: true,
    adminCode: '246810', // código 2FA simulado
  },
]

export const STATIONS = [
  {
    id: 'ST-CHA-01',
    name: 'Swapy Chapinero',
    address: 'Cl. 60 #7-30, Chapinero',
    coords: { lat: 4.6461, lng: -74.0628 },
    distanceKm: 0.6,
    walkMin: 3,
    status: 'online',
    lockers: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'],
  },
  {
    id: 'ST-ZNT-02',
    name: 'Swapy Zona T',
    address: 'Cra. 13 #82-71, Chicó',
    coords: { lat: 4.6672, lng: -74.0536 },
    distanceKm: 1.8,
    walkMin: 7,
    status: 'online',
    lockers: ['L1', 'L2', 'L3', 'L4'],
  },
  {
    id: 'ST-TEU-03',
    name: 'Swapy Teusaquillo',
    address: 'Av. Cra. 24 #39-15, Teusaquillo',
    coords: { lat: 4.6283, lng: -74.0751 },
    distanceKm: 2.9,
    walkMin: 11,
    status: 'maintenance',
    lockers: ['L1', 'L2', 'L3', 'L4'],
  },
]

// Cada batería ocupa un casillero (locker) de una estación.
// cells: voltajes de 4 grupos de celdas monitoreados individualmente.
const battery = (id, stationId, lockerId, soc, soh, temp, cycles, cells) => ({
  id,
  stationId,
  lockerId,
  soc, // State of Charge %
  soh, // State of Health %
  temp, // °C
  cycles,
  cells,
  status: soc >= 90 ? 'ready' : 'charging', // ready | charging | reserved | locked
  fault: null, // null | 'overheat' | 'undervoltage'  (falla inyectada por el panel demo)
  isolatedCells: [], // índices de celdas aisladas manualmente por el operador
  lockReason: null,
  lockType: null, // 'auto' (firmware) | 'manual' (operador)
  faultInjectedAt: null,
  lockedAt: null,
})

export const BATTERIES = [
  // Chapinero
  battery('SWP-B-0101', 'ST-CHA-01', 'L1', 100, 97, 27.4, 112, [4.19, 4.18, 4.2, 4.19]),
  battery('SWP-B-0102', 'ST-CHA-01', 'L2', 96, 93, 28.1, 241, [4.15, 4.14, 4.16, 4.15]),
  battery('SWP-B-0103', 'ST-CHA-01', 'L3', 62, 89, 33.6, 388, [3.94, 3.95, 3.93, 3.94]),
  battery('SWP-B-0104', 'ST-CHA-01', 'L4', 100, 95, 26.9, 157, [4.2, 4.19, 4.2, 4.2]),
  battery('SWP-B-0105', 'ST-CHA-01', 'L5', 92, 94, 28.4, 203, [4.12, 4.13, 4.12, 4.11]),
  // Zona T
  battery('SWP-B-0201', 'ST-ZNT-02', 'L1', 98, 91, 27.8, 302, [4.17, 4.18, 4.17, 4.16]),
  battery('SWP-B-0202', 'ST-ZNT-02', 'L2', 41, 86, 35.2, 455, [3.81, 3.8, 3.82, 3.81]),
  battery('SWP-B-0203', 'ST-ZNT-02', 'L3', 100, 96, 27.1, 98, [4.2, 4.2, 4.19, 4.2]),
  // Teusaquillo (en mantenimiento)
  battery('SWP-B-0301', 'ST-TEU-03', 'L1', 78, 72, 30.3, 690, [4.02, 4.01, 3.99, 4.02]),
]

// Reservas activas de otros repartidores (para que el admin vea quién reservó qué).
export const SEED_RESERVATIONS = [
  { token: 'SWP-K7MQ2R', userId: 'u-andres', batteryId: 'SWP-B-0201', stationId: 'ST-ZNT-02', lockerId: 'L1', minutesAgo: 3 },
  { token: 'SWP-P4XN8D', userId: 'u-valentina', batteryId: 'SWP-B-0104', stationId: 'ST-CHA-01', lockerId: 'L4', minutesAgo: 6 },
]
